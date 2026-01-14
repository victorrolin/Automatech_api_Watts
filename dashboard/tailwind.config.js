/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#0a0a0b',
                card: '#161618',
                accent: '#10b981',
            }
        },
    },
    plugins: [],
}
