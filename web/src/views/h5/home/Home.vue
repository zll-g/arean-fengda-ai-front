<template>
  <div class="home-page">
    <WelcomeCard />
    <SummaryMetrics />
    <ChartMetrics />
  </div>
</template>

<script setup lang="ts">
import WelcomeCard from './components/WelcomeCard.vue';
import SummaryMetrics from './components/SummaryMetrics.vue';
import ChartMetrics from './components/ChartMetrics.vue';
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  padding: 1rem;
  background: #f7f5f2;
}
</style>
