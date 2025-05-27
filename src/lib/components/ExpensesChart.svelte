<script lang="ts">
    import { onMount } from 'svelte';
    
    // Este componente ha sido reemplazado por SimplePieChart.svelte
    let mounted = false;
    
    onMount(() => {
        mounted = true;
    });
</script>

<div class="card chart-container">
    <h2>Componente reemplazado</h2>
    <p>Este componente ha sido reemplazado por SimplePieChart.svelte</p>
</div>

<style>
    .chart-container {
        width: 100%;
        max-width: 500px;
        margin: 0 auto;
    }
    
    h2 {
        text-align: center;
        margin-bottom: 1rem;
    }
</style>
