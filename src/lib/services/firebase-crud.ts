
import { db } from '../firebase';
import {
  collection, setDoc, updateDoc, deleteDoc, getDocs, doc, query, orderBy
} from 'firebase/firestore';
import type { Transaction } from '../stores/transactions';

const COLLECTION_NAME = 'transactions';

// Ahora el id lo pone el sistema (timestamp)
export async function addTransactionToFirestore(transaction: Transaction) {
  const id = transaction.id || `${Date.now()}`;
  const docRef = doc(db, COLLECTION_NAME, id);
  await setDoc(docRef, { ...transaction, id });
  return id;
}

// Obtener todas las transacciones ordenadas por fecha descendente
export async function getAllTransactionsFromFirestore(): Promise<Transaction[]> {
  const colRef = collection(db, COLLECTION_NAME);
  const q = query(colRef, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Transaction);
}

export async function updateTransactionInFirestore(transaction: Transaction) {
  if (!transaction.id) throw new Error('Transaction must have an id');
  const docRef = doc(db, COLLECTION_NAME, transaction.id);
  await setDoc(docRef, transaction, { merge: true });
}

export async function deleteTransactionFromFirestore(id: string) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}


