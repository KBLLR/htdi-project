// Copyright Mevedia UG - All Rights Reserved
// Author: Fyrestar <info@mevedia.com>


THREE.ComposedTexture = function ComposedTexture(container, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy) {

  this.canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
  this.ctx = this.canvas.getContext('2d');

  if (container) {

    this.assign(container);

  }

  THREE.CanvasTexture.call(this, this.canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);

  this.version = 0;

};

THREE.ComposedTexture.copyCanvas = (function () {

  let canvas, ctx;

  return {

    canvas: null,

    dispose: function () {

      this.canvas = canvas = ctx = null;

    },

    dataToImage: async function (data, width, height) {


      if (!canvas) {

        this.canvas = canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
        ctx = canvas.getContext('2d');

      }


      if (width !== canvas.width || height !== canvas.height) {

        canvas.width = width;
        canvas.height = height;

      }

      const imageData = ctx.getImageData(0, 0, width, height);

      const buffer = imageData.data;

      for (let i = 0, l = buffer.length; i < l; i++)
        buffer[i] = data[i];

      ctx.putImageData(imageData, 0, 0);

      return new Promise(resolve => {

        canvas.toBlob(blob => {

          const url = URL.createObjectURL(blob);

          const image = new Image;

          image.onload = function () {

            image.onload = null;

            URL.revokeObjectURL(url);

            resolve(image);

          };

          image.src = url;

        }, 'image/png');

      });

    }
  }

}());

THREE.ComposedTexture.index = [];
THREE.ComposedTexture.update = function (delta) {

  for (let texture of this.index)
    texture.update(delta);

};

Object.assign(THREE.ComposedTexture.prototype, THREE.EventDispatcher.prototype, THREE.Texture.prototype, THREE.CanvasTexture.prototype, {

  isCanvasTexture: true,
  isComposedTexture: true,

  constructor: THREE.ComposedTexture,

  time: 0,
  duration: 0,
  frameTime: 0,
  frameIndex: 0,
  framePreviousIndex: -1,
  disposalType: 0,
  progressive: false,
  ready: false,

  loop: true,
  auto: true,
  autoplay: true,
  isPlaying: false,

  dispose: function () {

    this.container = this.ctx = this.canvas = null;


    if (this.auto) {

      const i = THREE.ComposedTexture.index.indexOf(this);
      if (i > -1) THREE.ComposedTexture.index.splice(i, 1);

    }

    this.dispatchEvent({ type: 'dispose' });

  },

  pause: function () {

    this.isPlaying = false;

  },

  resume: function () {

    this.isPlaying = true;

  },

  play: function () {

    this.time = 0;
    this.frameIndex = 0;
    this.frameTime = 0;
    this.isPlaying = true;

  },

  stop: function () {

    this.time = 0;
    this.frameIndex = 0;
    this.frameTime = 0;
    this.isPlaying = false;

    this.compose(this.frameIndex);

  },

  update: function (delta) {


    if (this.isPlaying) {

      const container = this.container;

      const frame = container.frames[this.frameIndex];


      const t = delta * 1000;

      this.frameTime += t;
      this.time = Math.min(this.duration, this.time + t);

      if (this.frameTime >= frame.delay) {

        this.frameTime = 0;


        if (this.frameIndex < container.frames.length - 1) {

          this.frameIndex++;

        } else {

          if (this.loop) {

            this.time = 0;
            this.frameIndex = 0;

          } else {

            this.pause();

          }

        }

        this.compose(this.frameIndex);

      }


    }


  },

  assign: async function (container) {

    this.stop();

    this.auto = container.auto !== undefined ? container.auto : true;
    this.duration = 0;
    this.frameIndex = 0;
    this.framePreviousIndex = -1;
    this.disposalType = 0;
    this.progressive = true;
    this.ready = false;


    // Auto playback for all textures

    if (this.auto && THREE.ComposedTexture.index.indexOf(this) == -1)
      THREE.ComposedTexture.index.push(this);

    let { width, height } = container;

    const powerOfTwo = container.downscale ? THREE.Math.floorPowerOfTwo : THREE.Math.ceilPowerOfTwo;

    if (!THREE.Math.isPowerOfTwo(container.width))
      width = powerOfTwo(container.width);

    if (!THREE.Math.isPowerOfTwo(container.height))
      height = powerOfTwo(container.height);

    this.canvas.width = width;
    this.canvas.height = height;

    this.container = container;

    for (let frame of container.frames) {

      this.duration += frame.delay;

      if (frame.disposalType > 1)
        this.progressive = false;

      if (!frame.image) {

        frame.image = await THREE.ComposedTexture.copyCanvas.dataToImage(frame.patch, frame.dims.width, frame.dims.height);

      }

    }

    this.ready = true;

    this.dispatchEvent({ type: 'ready' });

    if (this.autoplay)
      this.play();


  },

  compose: function (frameIndex) {


    if (this.ready) {

      this.frameIndex = frameIndex;

      if (this.progressive && (this.framePreviousIndex > frameIndex || this.framePreviousIndex + 1 < frameIndex)) {

        // Needs to re-compose missing frames

        this.ctx.clearRect(0, 0, this.width, this.height);

        for (let i = 0; i <= frameIndex; i++)
          this._render(i);

      } else if (frameIndex !== this.framePreviousIndex) {

        this._render(frameIndex);

      }

      this.framePreviousIndex = frameIndex;

    } else if (this.idleRender instanceof Function) {

      this.idleRender(this.ctx);

    }

  },

  _render: function (frameIndex) {

    if (frameIndex === 0)
      this.frameRestoreIndex = -1;

    const {
      ctx,
      container,
      canvas,
      disposalType
    } = this;

    const currentFrame = container.frames[frameIndex];
    const dims = currentFrame.dims;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(canvas.width / container.width, canvas.height / container.height);


    if (frameIndex > 0) {

      if (disposalType === 3) {


        // Restore to previous

        if (this.frameRestoreIndex > -1) {

          const restoreFrame = container.frames[this.frameRestoreIndex];
          const dims = restoreFrame.dims;

          if (restoreFrame.blend === 0)
            ctx.clearRect(dims.left, dims.top, dims.width, dims.height);

          ctx.drawImage(restoreFrame.image, dims.left, dims.top, dims.width, dims.height);

        } else {

          // Nothing to restore, clear

          ctx.clearRect(dims.left, dims.top, dims.width, dims.height);

        }

      } else {

        this.frameRestoreIndex = Math.max(frameIndex - 1, 0);

      }

      if (disposalType === 2 && this.frameRestoreIndex > -1) {

        const restoreFrame = container.frames[this.frameRestoreIndex];
        const dims = restoreFrame.dims;

        ctx.clearRect(dims.left, dims.top, dims.width, dims.height);

      }


    }

    if (currentFrame.blend === 0)
      ctx.clearRect(dims.left, dims.top, dims.width, dims.height);

    ctx.drawImage(currentFrame.image, dims.left, dims.top, dims.width, dims.height);


    this.disposalType = currentFrame.disposalType;

    // Flag texture for upload

    this.version++;

  }

});


// ES6 class fix

if (parseInt(THREE.REVISION) > 126) {

  class ComposedTexture extends THREE.CanvasTexture {

    constructor(container, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy) {

      const canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
      const ctx = canvas.getContext('2d');


      super(canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy);

      this.canvas = canvas;
      this.ctx = ctx;
      this.version = 0;

      if (container) {

        this.assign(container);

      }

    }


  }

  Object.assign(ComposedTexture, THREE.ComposedTexture)
  Object.assign(ComposedTexture.prototype, THREE.ComposedTexture.prototype);

  THREE.ComposedTexture = ComposedTexture;

}
