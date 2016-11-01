Polymer({
  color: '#12A391',
  back: () => {
    if (!this.disableback) {
      this.fire('go-back');
    }
  }
});
