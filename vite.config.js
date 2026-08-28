import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    server: {
        host: '127.0.0.1', // ← adicione isso
    },
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/sidebar.jsx',
                'resources/js/storefront.jsx',
                'resources/js/login.jsx',
                'resources/js/produto.jsx',
                'resources/js/admin-products.jsx',
                'resources/js/checkout.jsx',
                'resources/js/checkout-pix.jsx',
                'resources/js/cart-page.jsx',
                // ADMIN
                'resources/js/admin-products.jsx',
                'resources/js/admin-categories.jsx',
            ],
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
        },
    },
})