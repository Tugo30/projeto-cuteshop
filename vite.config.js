import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
    server: {
        host: '127.0.0.1',
        allowedHosts: ['.monkeycode-ai.live'],
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
    plugins: [
        tailwindcss(),
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
                'resources/js/checkout-payment.jsx',
                'resources/js/cart-page.jsx',
                'resources/js/my-orders.jsx',
                'resources/js/profile.jsx',
                'resources/js/admin-coupons.jsx',
                'resources/js/admin-orders.jsx',
                'resources/js/admin-categories.jsx',
                'resources/js/admin-dashboard.jsx',
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
