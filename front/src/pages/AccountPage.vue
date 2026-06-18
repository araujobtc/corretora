<script setup lang="ts">
// Esta página foi substituída. O roteador redireciona /account → /conta-corrente automaticamente.
// Este componente nunca é renderizado — existe apenas para evitar erros de importação dinâmica
// em bundles antigos que ainda referenciem o caminho.
import { useRouter } from 'vue-router'
useRouter().replace('/conta-corrente')
</script>
<template><div /></template>
