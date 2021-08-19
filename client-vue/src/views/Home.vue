<template>
  <div class="home">
    <div class="home-header">
      <template v-if="status === 'login'">
        <a-input v-model="loginParams.name" placeholder="name" />
        <a-input v-model="loginParams.unique" placeholder="unique" />
        <a-button
          type="primary"
          :disabled="!loginParams.name || !loginParams.unique"
          @click="login"
          >login</a-button
        >
      </template>
      <template v-else-if="status === 'join'">
        <a-input v-model="createParam" placeholder="create" />
        <a-button type="primary" :disabled="!createParam" @click="create"
          >create</a-button
        >
        <a-input v-model="joinParam" placeholder="join" />
        <a-button type="primary" :disabled="!joinParam" @click="join"
          >join</a-button
        >
        <a-button type="primary" @click="logout">logout</a-button>
      </template>
      <template v-else-if="status === 'room' || status === 'chat'">
        <p>{{ user.id }}</p>
        <p>{{ user.name }}</p>
        <p>{{ user.unique }}</p>
        <p>{{ room.id }}</p>
        <p>{{ room.name }}</p>
        <a-button type="primary" @click="leave">leave</a-button>
        <a-button type="primary" @click="logout">logout</a-button>
      </template>
      <template v-else> please login first</template>
    </div>
    <a-row
      class="home-content"
      :style="
        status !== 'room' &&
        status !== 'chat' &&
        'align-items: center; justify-content: center'
      "
    >
      <a-result
        v-if="status !== 'room' && status !== 'chat'"
        title="please login and create or join a room!"
      >
        <template #icon>
          <a-icon type="smile" theme="twoTone" />
        </template>
      </a-result>
      <template v-else>
        <a-col :span="4" class="home-content-user">
          <a-list item-layout="horizontal" :data-source="users">
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta :description="item.unique">
                <p slot="title">{{ item.name }}</p>
              </a-list-item-meta>
            </a-list-item>
          </a-list>
        </a-col>
        <a-col :span="12" class="home-content-message">
          <a-list
            item-layout="horizontal"
            class="home-content-message-list"
            :data-source="messages"
          >
            <a-list-item
              slot-scope="msg"
              :class="[
                `home-content-message-list-${
                  msg.message.userId !== user.id ? 'left' : 'right'
                }`,
              ]"
              slot="renderItem"
            >
              <div class="home-content-message-list-user">
                <p>{{ msg.user ? msg.user.name : "none" }}</p>
                <span>{{ moment(msg.message.timestamp).format("HH:mm") }}</span>
              </div>
              <div class="home-content-message-list-message">
                {{ msg.message.content }}
              </div>
            </a-list-item>
          </a-list>
          <div class="home-content-message-input">
            <a-textarea
              class="home-content-message-input-textarea"
              placeholder="发送消息"
              v-model="message"
            />
            <div class="home-content-message-input-btn">
              <a-button
                type="primary"
                :disabled="!Boolean(message)"
                @click="send"
                >发送</a-button
              >
            </div>
          </div>
        </a-col>
        <a-col :span="8" class="home-content-chat">
          <div class="home-content-chat-main">
            <video-card
              v-if="localStream"
              :name="user.name"
              :src-object="localStream"
            />
            <a-result
              title="leave chat"
              class="home-content-chat-card"
              v-if="localStream"
            >
              <template #icon>
                <!--                <a-icon type="smile" theme="twoTone" />-->
              </template>
              <template #extra>
                <a-button type="primary" @click="leaveChat"> leave </a-button>
              </template>
            </a-result>
            <a-result
              v-if="!localStream"
              title="join chat"
              class="home-content-chat-card"
            >
              <template #icon>
                <!--              <a-icon type="smile" theme="twoTone" />-->
              </template>
              <template #extra>
                <a-button type="primary" @click="joinChat"> chat </a-button>
              </template>
            </a-result>
            <video-card
              v-for="chat in chats.filter((p) => p.stream)"
              :key="chat.user.id"
              :name="chat.user.name"
              :src-object="chat.stream"
            />
          </div>
        </a-col>
      </template>
    </a-row>
  </div>
</template>

<script>
import { io } from "socket.io-client";
import moment from "moment";
import VideoCard from "../components/VideoCard";

export default {
  name: "Home",
  components: { VideoCard },
  data() {
    return {
      status: null,
      socket: null,
      clientType: navigator.userAgent.match(
        /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i
      )
        ? "mobile"
        : "pc",
      loginParams: { name: null, unique: null },
      createParam: null,
      joinParam: null,
      message: null,
      users: [],
      messages: [],
      chats: [],
      user: null,
      client: null,
      room: null,
      localStream: null,
    };
  },
  mounted() {
    // 页面刷新
    window.addEventListener("beforeunload", (event) => {
      event.preventDefault();
      if (this.socket) {
        this.socket.emit("close", {
          userId: this.user ? this.user.id : null,
          roomId: this.room ? this.room.id : null,
          clientType: this.clientType,
        });
      }
    });

    this.socket = io("http://localhost:8000", {});

    this.socket.on("connect", () => {
      console.log("connect");
      this.status = "login";
    });
    // 登录反馈
    this.socket.on("login", (res) => {
      console.log("login", res);
      if (res.status === "success") {
        this.user = res.data;
        this.client = this.user.clients.find((p) => p.type === this.clientType);
        sessionStorage.setItem("user", JSON.stringify(this.user));
        this.status = "join";

        if (sessionStorage.getItem("room")) {
          let _room = JSON.parse(sessionStorage.getItem("room"));
          this.joinParam = _room.id;
          this.join();
        }
      } else if (res.status === "error") {
        this.user = null;
        this.status = "login";
      }
      this.loginParams = { name: null, unique: null };
    });
    // 登出反馈
    this.socket.on("logout", (res) => {
      console.log("logout", res);
      sessionStorage.clear();
      this.status = "login";
      this.user = null;
      this.client = null;
      this.room = null;
      this.users = [];
      this.messages = [];
      this.chats = [];
    });
    // 新建房间反馈
    this.socket.on("create", (res) => {
      console.log("create", res);
      if (res.status === "success") {
        this.room = res.data;
        sessionStorage.setItem("room", JSON.stringify(this.room));
        this.status = "room";
        this.messages = this.room.messages.map((item) => {
          let _user = this.users.find((p) => p.id === item.userId);
          return {
            user: _user,
            message: item,
          };
        });
        this.users = this.room.member;
        console.log(this.room.chats);
        this.room.chats.forEach((item) => {
          if (item.user.id === this.user.id) return;
          let _chat = this.chats.find((p) => p.user.id === item.user.id);
          if (_chat && _chat.user && _chat.client) {
            if (_chat.client.socketId !== item.client.socketId) {
              // change peerConnection
              if (_chat.connection) {
                _chat.connection.close();
                _chat.connection = null;
              }
              _chat.stream = null;
            }
          } else {
            // create peerConnection
            _chat = {
              user: item.user,
              client: item.client,
              connection: null,
              options: item.options,
              stream: null,
            };
            this.chats.push(_chat);
          }
        });
      }
      this.createParam = null;
    });
    // 加入房间反馈
    this.socket.on("join", (res) => {
      console.log("join", res);
      if (res.status === "success") {
        this.joinParam = null;
      }
    });
    // 离开房间反馈
    this.socket.on("leave", (res) => {
      console.log("leave", res);
      if (res.status === "success") {
        this.status = "join";
        this.room = null;
        this.users = [];
        this.messages = [];
        this.chats = [];
      }
    });
    // 更新房间数据（users，messages，chats）
    this.socket.on("room", (res) => {
      console.log("room", res);
      if (res.status === "success") {
        this.room = res.data;

        sessionStorage.setItem("room", JSON.stringify(this.room));
        this.users = this.room.member;
        this.messages = this.room.messages.map((item) => {
          let _user = this.users.find((p) => p.id === item.userId);
          return {
            user: _user,
            message: item,
          };
        });

        this.chats.forEach((item) => {
          if (!this.room.chats.find((q) => q.user.id === item.user.id)) {
            if (item.connection) {
              item.connection.close();
              item.connection = null;
              item.stream = null;
            }
          }
        });

        this.chats = this.chats.filter((p) =>
          this.room.chats.find((q) => q.user.id === p.user.id)
        );

        this.room.chats.forEach((item) => {
          if (item.user.id === this.user.id) return;
          let _chat = this.chats.find((p) => p.user.id === item.user.id);

          if (!_chat) {
            _chat = {
              user: item.user,
              client: item.client,
              connection: null,
              options: item.options,
              stream: null,
            };
            this.chats.push(_chat);
          } else if (_chat.client.socketId !== item.client.socketId) {
            // change peerConnection
            if (_chat.connection) {
              _chat.connection.close();
              _chat.connection = null;
            }
            _chat.client = item.client;
            _chat.user = item.user;
            _chat.stream = null;
          }
        });

        if (this.localStream) {
          this.chats.forEach((item) => {
            if (this.localStream) {
              if (!item.connection) {
                this.register(item);
              }
              if (this.status === "chat") {
                this.connect(item);
              }
            }
          });
        }

        this.status = "room";
      }
    });
    // 发送消息反馈
    this.socket.on("message", (res) => {
      console.log("message", res);
      if (res.status === "success") {
        this.message = null;
      }
    });
    // 加入聊天（media）反馈
    this.socket.on("join_chat", (res) => {
      console.log("join_chat", res);
      this.status = "chat";
    });
    // 离开聊天（media）反馈
    this.socket.on("leave_chat", (res) => {
      console.log("leave_chat", res);
      this.status = "room";
      this.chats = [];
    });
    // webrtc
    this.socket.on("chat", (res) => {
      console.log("chat", res);
      if (res.status === "success") {
        let _chat = this.chats.find((p) => p.client.socketId === res.data.from);
        if (!_chat) return;
        if (res.data.sdp) {
          if (res.data.sdp.type === "offer") {
            _chat.connection
              .setRemoteDescription(res.data.sdp)
              .then(() => {
                return _chat.connection.createAnswer();
              })
              .then((answer) => {
                return _chat.connection.setLocalDescription(answer);
              })
              .then(() => {
                this.p2p(
                  res.data.from,
                  _chat.connection.localDescription,
                  null
                );
              });
          } else {
            _chat.connection.setRemoteDescription(res.data.sdp);
          }
        }
        if (
          res.data.candidate &&
          _chat.connection.remoteDescription &&
          _chat.connection.remoteDescription.type
        ) {
          _chat.connection.addIceCandidate(res.data.candidate);
        }
      }
    });
    // 断开连接
    this.socket.on("disconnect", () => {
      console.log("disconnect");
      this.user = null;
      this.client = null;
      this.room = null;
      this.users = [];
      this.messages = [];
      this.chats = [];
      this.status = null;
      this.socket = null;
      this.localStream = null;
    });

    if (sessionStorage.getItem("user")) {
      let _user = JSON.parse(sessionStorage.getItem("user"));
      this.loginParams = { name: _user.name, unique: _user.unique };
      this.login();
    }
  },
  methods: {
    /**
     * 登录
     */
    login() {
      this.socket.emit("login", {
        ...this.loginParams,
        clientType: this.clientType,
      });
    },
    /**
     * 登出
     */
    logout() {
      this.socket.emit("logout", {
        userId: this.user.id,
        roomId: this.room ? this.room.id : null,
        clientType: this.clientType,
      });
    },
    /**
     * 新建房间
     */
    create() {
      this.socket.emit("create", {
        userId: this.user.id,
        roomName: this.createParam,
      });
    },
    /**
     * 加入房间
     */
    join() {
      this.socket.emit("join", {
        userId: this.user.id,
        roomId: this.joinParam,
      });
    },
    /**
     * 离开房间
     */
    leave() {
      this.socket.emit("leave", { userId: this.user.id, roomId: this.room.id });
    },
    /**
     * 发送消息
     */
    send() {
      this.socket.emit("message", {
        userId: this.user.id,
        roomId: this.room.id,
        content: this.message,
      });
    },
    /**
     * 加入聊天（media）
     */
    joinChat() {
      navigator.mediaDevices
        .getUserMedia({
          audio: true,
          video: {
            width: { min: 1024, ideal: 1280, max: 1920 },
            height: { min: 576, ideal: 720, max: 1080 },
          },
        })
        .then((stream) => {
          this.localStream = stream;
        })
        // .then(() => {
        //   this.$refs.local.srcObject = this.localStream;
        // })
        .then(() => {
          this.socket.emit("join_chat", {
            userId: this.user.id,
            roomId: this.room.id,
            clientType: this.clientType,
          });
        });
    },
    /**
     * 离开聊天（media）
     */
    leaveChat() {
      this.localStream.getTracks().forEach(function (track) {
        if (track.readyState === "live") {
          track.stop();
        }
      });
      this.localStream = null;
      this.socket.emit("leave_chat", {
        userId: this.user.id,
        roomId: this.room.id,
      });
    },
    /**
     * webrtc
     */
    p2p(to, sdp, candidate) {
      this.socket.emit("chat", {
        from: this.socket.id,
        to: to,
        sdp: sdp,
        candidate: candidate,
      });
    },
    /**
     * 注册 peerConnection
     */
    register(param) {
      param.connection = new RTCPeerConnection();
      this.localStream.getTracks().forEach((track) => {
        param.connection.addTrack(track, this.localStream);
      });
      param.connection.ontrack = (event) => {
        if (event.streams.length > 0) {
          if (param.stream !== event.streams[0]) {
            param.stream = event.streams[0];
          }
        }
      };
      param.connection.onicecandidate = (event) => {
        if (event.candidate) {
          this.p2p(param.client.socketId, null, event.candidate);
        }
      };
    },
    /**
     * 发起 p2p 连接
     */
    connect(param) {
      param.connection
        .createOffer()
        .then((offer) => {
          if (param.connection.signalingState !== "stable")
            return Promise.reject(
              `connection state is ${param.connection.signalingState}`
            );
          return param.connection.setLocalDescription(offer);
        })
        .then(() => {
          this.p2p(
            param.client.socketId,
            param.connection.localDescription,
            null
          );
        });
    },
    moment,
  },
};
</script>

<style lang="less" scoped>
.home {
  width: 100%;
  height: 100%;
  padding: 24px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &-header {
    margin-bottom: 12px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;

    > input {
      min-width: 120px;
      max-width: 200px;
    }

    * {
      margin-left: 12px;
    }
  }

  &-content {
    flex: 1 1 auto;
    display: flex;
    flex-direction: row;
    overflow: hidden;

    &-user,
    &-message,
    &-chat {
      border: 1px solid #ebedf0;
      border-radius: 2px;
    }

    &-user,
    &-chat {
      overflow: hidden scroll;
    }

    &-message {
      display: flex;
      flex-direction: column;

      &-list {
        flex: 4 1 auto;
        background: #f3f3f3;
        border-bottom: 1px solid #ebedf0;
        overflow: hidden scroll;

        &-left {
          padding: 12px;
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
          align-items: flex-start;
        }

        &-right {
          padding: 12px;
          display: flex;
          flex-direction: row-reverse;
          justify-content: flex-start;
          align-items: flex-start;
        }

        &-user {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          > p {
            margin-bottom: 0;
            border-radius: 2px;
            background: #fff;
            padding: 6px 12px;
            display: flex;
            flex-direction: column;
          }

          > span {
            font-size: 6px;
          }
        }

        &-message {
          border: 1px solid #b7eb8f;
          border-radius: 2px;
          background: #f6ffed;
          padding: 6px 12px;
          min-height: 33px;
          margin-right: 6px;
          margin-left: 6px;
        }
      }

      &-input {
        flex: 1 1 auto;
        padding: 12px;
        display: flex;
        flex-direction: column;

        > textarea {
          flex: 1 1 auto;
        }

        &-btn {
          flex: 0 1 48px;
          display: flex;
          flex-direction: row-reverse;
          align-items: center;
        }
      }
    }

    &-chat {
      position: relative;
      display: block;
      //width: 100%;
      height: 100%;

      &-main {
        width: 100%;
        //height: 100%;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
      }

      &-card {
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
    }
  }
}
</style>
