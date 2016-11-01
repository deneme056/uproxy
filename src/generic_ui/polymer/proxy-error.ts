/// <reference path='./context.d.ts' />
/// <reference path='../../../third_party/polymer/polymer.d.ts' />

Polymer({
  error: false,
  openWithError: () => {
    this.wasError = true;
    this.open();
  },
  open: () => {
    this.$.dialog.open();
  },
  close: () => {
    this.wasError = false;
    this.$.dialog.close();
  },
});
