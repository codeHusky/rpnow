<template>
  <div class="dialog-container overlay" @click="close" v-show="showCharacterDialog || isDialogSending">

    <div id="character-dialog" class="dialog" @click.stop v-show="showCharacterDialog">
      <div>
        <input placeholder="Name your character" type="text" maxlength="30" v-model="charaDialogName">
      </div>
      <div>
        <spectrum-colorpicker v-model="charaDialogColor"></spectrum-colorpicker>
      </div>
      <div>
        <button type="button" class="outline-button" @click="submit">Save</button>
        <button type="button" class="outline-button" @click="close">Cancel</button>
      </div>
    </div>

    <template v-if="isDialogSending">
      <i class="material-icons">hourglass_full</i>
      <span>Loading...</span>
    </template>

  </div>
</template>

<script>
  module.exports = {
    props: [
      'send',
    ],
    data: function() {
      return {
        showCharacterDialog: false,
        charaDialogId: null,
        charaDialogName: '',
        charaDialogColor: '#dddddd',
        isDialogSending: false,
      };
    },
    computed: {
      isValid: function() {
        return this.charaDialogName.trim().length > 0;
      },
    },
    methods: {
      open: function(chara) {
        if (chara != null) {
          this.charaDialogId = chara._id;
          this.charaDialogName = chara.name;
          this.charaDialogColor = chara.color;
        } else {
          this.charaDialogId = null;
          this.charaDialogName = '';
          // leave charaDialogColor as it was
        }
        this.showCharacterDialog = true;
      },
      close: function() {
        if (!this.isDialogSending) {
          this.showCharacterDialog = false;
        }
      },
      submit: function() {
        if (!this.isValid) return;

        var data = {
          name: this.charaDialogName,
          color: this.charaDialogColor,
        };

        this.showCharacterDialog = false;
        this.isDialogSending = true;

        this.send(data, this.charaDialogId)
          .then((function(res) {
            if (this.charaDialogId) {
              this.$emit('edited', res);
            } else {
              this.$emit('created', res);
            }
            this.isDialogSending = false;
          }).bind(this))
          .catch((function() {
            this.isDialogSending = false;
          }).bind(this));
      }
    },
    components: {
      'spectrum-colorpicker': {
        props: ['value'],
        template: '<input ref="el">',
        mounted: function() {
          var vm = this;
          jQuery(this.$refs.el).spectrum({
            color: this.value,
            showInput: true,
            preferredFormat: "hex",
            move: function(color) {
              vm.$emit('input', color.toHexString());
            },
            change: function(color) {
              vm.$emit('input', color.toHexString());
            },
            hide: function(color) {
              vm.$emit('input', color.toHexString());
            },
          });
        },
        watch: {
          value: function(value) {
            jQuery(this.$refs.el).spectrum('set', value);
          }
        }
      }
    }
  };
</script>
