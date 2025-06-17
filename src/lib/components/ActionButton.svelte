<script lang="ts">
    export let text: string;
    export let icon: string | null = null;
    export let action: () => void;
    export let disabled: boolean = false;
    export let variant: 'primary' | 'secondary' | 'danger' = 'primary';
    export let loading: boolean = false;
</script>

<button 
    class={`action-button ${variant} ${loading ? 'loading' : ''}`}
    on:click={action}
    disabled={disabled || loading}
    aria-busy={loading}
    aria-label={text}
>
    {#if loading}
        <span class="spinner" aria-hidden="true"></span>
    {:else if icon}
        <span class="icon" aria-hidden="true">{icon}</span>
    {/if}
    {text}
</button>

<style>
    .action-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        border: none;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s, opacity 0.2s;
        min-width: 100px;
    }
    
    .action-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .primary {
        background-color: #2196F3;
        color: white;
    }
    
    .primary:hover:not(:disabled) {
        background-color: #1976D2;
    }
    
    .secondary {
        background-color: #f5f5f5;
        color: #333;
        border: 1px solid #ddd;
    }
    
    .secondary:hover:not(:disabled) {
        background-color: #e9e9e9;
    }
    
    .danger {
        background-color: #F44336;
        color: white;
    }
    
    .danger:hover:not(:disabled) {
        background-color: #D32F2F;
    }
    
    .icon {
        margin-right: 0.5rem;
    }
    
    .spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: spin 1s linear infinite;
        margin-right: 8px;
    }
    
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    
    .loading {
        pointer-events: none;
    }
</style>
