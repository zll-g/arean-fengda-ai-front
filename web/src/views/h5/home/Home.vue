<template>
  <WelcomeCard />
  <MyTodo />
  <Recommend />
</template>

<script setup lang="ts">
import WelcomeCard from './components/WelcomeCard.vue';
import MyTodo from './components/MyTodo.vue';
import Recommend from './components/Recommend.vue';
</script>

<style scoped>
* {
  padding: 1rem;
  text-align: left;
}
</style>
