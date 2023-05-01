// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    modules: [
        '@nuxtjs/tailwindcss',
        '@nuxtjs/i18n'
    ],
    plugins: [
        {
            src: '~/plugins/fontawesome.ts'
        }
    ],
    css: [
        '@fortawesome/fontawesome-svg-core/styles.css'
    ],
    components: true,
    app: {
        head: {
            script: [
                {
                    src: 'js/opencv.js'
                }
            ]
        }
    }
})
