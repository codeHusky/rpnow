<template>
  <div id="send-box" :class="messageBoxClass" :style="messageBoxStyle">

    <div id="voice-bar">
      <div id="click-to-change" title="Change character" @click="$emit('open-character-menu')">
        {{ currentVoiceName }}
      </div>
      <button class="icon-button" @click="$emit('open-character-menu')">
        <i class="material-icons" title="Change character">people</i>
      </button>
      <button class="icon-button" @click="$refs.imageDialog.open(null)">
        <i class="material-icons" title="Post image">image</i>
      </button>
      <button class="icon-button" @click="showFormatGuide">
        <i class="material-icons" title="Formatting info">text_fields</i>
      </button>
    </div>

    <div id="typing-area">
      <textarea
        rows="3"
        placeholder="Type your message."
        maxlength="10000"
        :disabled="isMsgBoxSending"
        v-model="msgBoxText"
        @keydown.enter.ctrl.exact="($event.preventDefault(), submit())"
        @keydown.enter.exact="pressEnterToSend ? ($event.preventDefault(), submit()) : null"
        @input="resizeTextareaOnInput($event, 3, 6)"
      ></textarea>
      <template v-if="!isMsgBoxSending">
        <button class="icon-button" :disabled="!msgBoxValid" @click="submit">
          <i class="material-icons" title="Send">send</i>
        </button>
      </template>
      <template v-if="isMsgBoxSending">
        <div id="send-loader-container">
          <i class="material-icons">hourglass_full</i>
        </div>
      </template>
    </div>

    <image-dialog ref="imageDialog" :send="send"></image-dialog>

  </div>
</template>

<script>
  module.exports =  {
    components: {
      'image-dialog': require('./image-dialog.vue'),
    },
    props: [
      'charasById',
      'pressEnterToSend',
      'send',
      'voice',
    ],
    data: function() {
      return {
        msgBoxText: '',
        isMsgBoxSending: false,
      };
    },
    computed: {
      currentChara: function() {
        if (this.voice.type !== 'chara') return undefined;
        return this.charasById[this.voice.charaId]
      },
      currentVoiceName: function() {
        if (this.voice.type === 'narrator') return 'Narrator';
        if (this.voice.type === 'ooc') return 'Out of Character';
        return this.currentChara.name;
      },
      currentCharaColor: function() {
        if (this.voice.type !== 'chara') return undefined;
        return this.currentChara.color;
      },
      messageBoxClass: function() {
        return 'send-box-' + this.voice.type;
      },
      messageBoxStyle: function() {
        if (this.voice.type !== 'chara') return {};
        else return {
          'background-color': this.currentCharaColor,
          'color': tinycolor(this.currentCharaColor).isLight() ? 'black' : 'white',
        };
      },
      msgBoxValid: function() {
        return this.msgBoxText.trim().length > 0;
      },
    },
    methods: {
      applyShortcutsToMessage: function(msg) {
        if (msg.type !== 'ooc') {
          var oocShortcuts = [
            /^\({2,}\s*(.*?[^\s])\s*\)*$/g, // (( message text ))
            /^\{+\s*(.*?[^\s])\s*\}*$/g, // { message text }, {{ message text }}, ...
            /^\/\/\s*(.*[^\s])\s*$/g // //message text
          ];
          for (var i = 0; i < oocShortcuts.length; ++i) {
            var regex = oocShortcuts[i];
            var match = regex.exec(msg.content);
            if (match) {
              return { type: 'ooc', content: match[1] };
            }
          }
        }
        return msg;
      },
      submit: function() {
        if (!this.msgBoxValid) return;

        var wasFocused = (document.activeElement === document.querySelector('#typing-area textarea'));

        var data = {
          content: this.msgBoxText,
          type: this.voice.type,
          charaId: this.voice.charaId || undefined,
        };

        data = this.applyShortcutsToMessage(data);

        this.isMsgBoxSending = true;

        this.send(data)
          .then((function() {
            this.msgBoxText = '';
            this.isMsgBoxSending = false;
            if (wasFocused) this.$nextTick(function() { document.querySelector('#typing-area textarea').focus() });
          }).bind(this))
          .catch((function() {
            this.isMsgBoxSending = false;
          }).bind(this));
      },
      resizeTextareaOnInput: function($event, minRows, maxRows) {
        var el = $event.target;
        while (el.rows > minRows && el.scrollHeight <= el.offsetHeight) {
          el.rows = el.rows - 1;
        }
        while (el.rows < maxRows && el.scrollHeight > el.offsetHeight) {
          el.rows = el.rows + 1;
        }
      },
      showFormatGuide: function() {
        window.open('/format', '_blank').focus();
      },
    }
  };
</script>
