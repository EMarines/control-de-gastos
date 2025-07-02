
import { db } from '../firebase';
import {
  collection, setDoc, updateDoc, deleteDoc, getDocs, doc, query, orderBy, startAfter, limit as fbLimit
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


// Obtener todas las transacciones ordenadas por fecha descendente (sin paginación)
export async function getAllTransactionsFromFirestore(): Promise<Transaction[]> {
  const colRef = collection(db, COLLECTION_NAME);
  const q = query(colRef, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Transaction);
}

// Obtener una página de transacciones ordenadas por fecha descendente
export async function getTransactionsPageFromFirestore(pageSize: number, lastDoc?: any): Promise<{ data: Transaction[], lastDoc: any }> {
  const colRef = collection(db, COLLECTION_NAME);
  let q;
  if (lastDoc) {
    q = query(colRef, orderBy('date', 'desc'), startAfter(lastDoc), fbLimit(pageSize));
  } else {
    q = query(colRef, orderBy('date', 'desc'), fbLimit(pageSize));
  }
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Transaction);
  const lastVisible = snapshot.docs[snapshot.docs.length - 1];
  return { data: docs, lastDoc: lastVisible };
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


