import { library, config } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { faInstagram } from '@fortawesome/free-brands-svg-icons';
import { faCircleNotch, faHeart, faMoon, faSun } from '@fortawesome/free-solid-svg-icons';

library.add(
    faInstagram,
    faHeart,
    faMoon,
    faSun,
    faCircleNotch
);
config.autoAddCss = false;

export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.component('fa-icon', FontAwesomeIcon)
});