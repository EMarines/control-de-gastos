<script lang="ts">
    import '../app.css';
    import { loadFirstPage } from '../lib/stores/transactions';
    
    // Cargar los datos al iniciar la aplicación
    loadFirstPage().catch(error => {
        console.error('Error al cargar datos iniciales:', error);
    });
</script>

<div class="app">
    <slot />
</div>

<style>
    .app {
        width: 100%;
        min-height: 100vh;
    }
</style>
