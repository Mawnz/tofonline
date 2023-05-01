<template>
    <div class="flex flex-col h-screen justify-between bg-background-light dark:bg-background-dark">
        <div class="
        w-100
        bg-primary-light
        dark:bg-primary-dark
        justify-self-start
        text-secondary-light
        dark:text-secondary-dark
        p-3
        text-right
    ">
            <fa-icon @click="toggleDarkMode" class="text-primary hover:cursor"
                :icon="['fa-solid', dark ? 'fa-moon' : 'fa-sun']"></fa-icon>
        </div>
        <slot></slot>
        <div class="
        w-100
        bg-primary-light
        dark:bg-primary-dark
        justify-self-start
        text-secondary-light
        dark:text-secondary-dark
        p-3
        text-right
    ">
            Made by <a class="text-tertiary-light" href="https://www.instagram.com/mawnz/" target="_blank">@mawnz</a> with <fa-icon class="text-primary" :icon="['fa-solid', 'heart']"></fa-icon>
        </div>
    </div>
</template>

<script setup>
let dark = ref(false)

function toggleDarkMode() {
    dark.value = !dark.value;
    if (dark && !document.querySelector('html').classList.contains('dark')) {
        document.querySelector('html').classList.add('dark');
    } else if (document.querySelector('html').classList.contains('dark')) {
        document.querySelector('html').classList.remove('dark');
    }
}
</script>
