<template>
  <div>
    <!-- <UppyUpload /> -->
    <UInput ref="fileInput" type="file" @change="handleFileChange" />
    <button @click="upLoadVideo">Upload</button>
    {{ data }}
  </div>
</template>

<script setup>
// import UppyUpload from '~/components/UppyUpload.vue'
const fileInput = ref(null)
const selectedFile = ref(null)

// watch(fileInput, (newFileInput) => {
//   console.log(newFileInput)
// })

const handleFileChange = (e) => {
  console.log(e)
  selectedFile.value = e[0]
  console.log(selectedFile.value)
  // console.log(selectedFile.value)
}


// const options = {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json', 'Upload-Creator': '', 'X-Auth-Email': '' },
//   body: '{"allowedOrigins":["*"],"creator":"creator-id_abcde12345","expiry":"Now + 30 minutes","maxDurationSeconds":1,"meta":{"name":"video12345.mp4"},"requireSignedURLs":true,"scheduledDeletion":"2014-01-02T02:20:00Z","thumbnailTimestampPct":0.529241,"watermark":{"uid":"ea95132c15732412d22c1476fa83f27a"}}'
// };

// fetch('https://api.cloudflare.com/client/v4/accounts/account_id/stream/direct_upload', options)
//   .then(response => response.json())
//   .then(response => console.log(response))
//   .catch(err => console.error(err));

const {data} = await useFetch('https://mma.hoanglinh9955.workers.dev/api/user')

const upLoadImage = async (e) => {
  const formData = new FormData();
  formData.append('file', selectedFile.value);  
  formData.append('type', selectedFile.value.type);
  formData.append('name', selectedFile.value.name);
  formData.append('user_id', 'creator-id_abcde12345');
  formData.append('creator', 'creator-id_abcde12345');
//   formData.append('expiry', '');
// formData.append('id', '');
// formData.append('metadata', '');
// formData.append('requireSignedURLs', '');
  
  const { data } = await useFetch(`https://api.cloudflare.com/client/v4/accounts/7c1852814450c3d39a461af14cce42a8/images/v1`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer fc6wipAC6T-rBqHf7o55dhwSEOX8ZLkJckikAnIC`,
    },
    body: formData
  })

  
  console.log(data)

  // if (data.value.success) {
  //   // console.log(data.value.result.uploadURL)
  //   const { data: data1, status } = await useFetch(`https://upload.cloudflarestream.com/ed947de9dc764ed39c025c12ade54c62`, {
  //     method: 'POST',
  //     body: formData
  //   })
  //   console.log(data1)
  //   console.log(status)
  // }
  
}

const upLoadVideo = async (e) => {
  const formData = new FormData();
  formData.append('file', selectedFile.value);  
  formData.append('type', "video/mp4");
  formData.append('name', selectedFile.value.name);
  formData.append('user_id', 'creator-id_abcde12345');
  formData.append('creator', 'creator-id_abcde12345');


  const {data} = await useFetch(`https://mma.hoanglinh9955.workers.dev/api/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: formData
})
console.log(data)
  // const { data } = await useFetch(`https://api.cloudflare.com/client/v4/accounts/7c1852814450c3d39a461af14cce42a8/stream/direct_upload`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer Zsx7DfagQxmlv5j1o36oooVjsXfWWv0U5kzRQnKL`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     "maxDurationSeconds": 3600,
  //     "meta": {
  //       "name": "video9999999.mp4"
  //     },
  //     "creator":"creator-id_abcde12345",
      
  //   })
  // })

  // console.log(selectedFile.value)
  
  // console.log(data.value)

  // if (data.value.success) {
  //   console.log(data.value.result.uploadURL)
  //   const { data: data1, status } = await useFetch(`${data.value.result.uploadURL}`, {
  //     method: 'POST',
  //     body: formData
  //   })
  //   console.log(data1)
  //   console.log(status)
  // }
  
}
</script>
