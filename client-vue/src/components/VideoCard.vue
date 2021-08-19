<template>
  <div class="card">
    <video ref="video" controls muted autoplay></video>
    <p>{{ name }}</p>
  </div>
</template>

<script>
export default {
  name: "VideoCard",
  props: {
    srcObject: null,
    name: null,
  },
  mounted() {
    this.$refs.video.srcObject = this.srcObject;
  },
};
</script>

<style scoped lang="less">
.card {
  width: 200px;
  height: 160px;
  background: #f3f3f3;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-radius: 2px;
  margin: 6px;

  > video {
    width: 200px;
    height: 140px;
  }

  > p {
    height: 20px;
    margin: 0;
  }
}
</style>
