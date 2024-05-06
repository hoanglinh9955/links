<template>
  <div>
    have dataaaaaaaa
    {{ data }}
  </div>
</template>

<script lang="ts" setup>
const { data, pending, error, refresh } = await useFetch('/api/users/getUsers')
console.log(data.value)
</script>

<style>

</style>