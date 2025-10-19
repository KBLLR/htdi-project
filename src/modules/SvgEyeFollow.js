////////////////////////////////////////////////////////////////////
// Eye(svg) following Cursor
///////////////

// HTML
// <div class="floatingBtn" id="jsFB">
// <svg style="width:100%;height:100%;"viewBox="0 0 94 57.15" xmlns="http://www.w3.org/2000/svg">
// <path 
// d="m2.99 27.95 10.6-11.72 14.23-10.19 15.49-3.77 13.68 1.73 11.72 3.71 9.9 6.31 9.49 9.74 3.07 5.44-11.44 12.84-15.77 11.11-18.42 2.42-12-2.42-13.95-6.09-10.74-9.35z" fill="white"/>
// <path 
// d="m94 28.57s0-.05 0-.07 0-.09 0-.14a.38.38 0 0 0 0-.1v-.06a1.1 1.1 0 0 0 -.06-.26s0 0 0-.07a1.66 1.66 0 0 0 -.15-.33c0-.07-.1-.15-.16-.22v-.05c-.85-1-1.71-1.94-2.58-2.95-9.52-10.9-21.2-24.32-44.05-24.32s-34.53 13.42-43.91 24.21c-.88 1-1.73 2-2.58 2.94v.05a1.88 1.88 0 0 0 -.16.23 2.52 2.52 0 0 0 -.14.33.13.13 0 0 0 0 .06 2.13 2.13 0 0 0 -.07.27v.06a.28.28 0 0 0 0 .09v.14s0 .05 0 .07h-.14s0 0 0 .07 0 .09 0 .14a.28.28 0 0 0 0 .09v.25a1.31 1.31 0 0 0 .06.27s0 0 0 .06a1.66 1.66 0 0 0 .15.33 1.88 1.88 0 0 0 .16.23c.85.95 1.71 1.94 2.58 2.94 9.52 10.9 21.2 24.32 44.05 24.32s34.53-13.42 43.91-24.21c.88-1 1.73-2 2.58-2.94a.1.1 0 0 0 0-.05 1.77 1.77 0 0 0 .16-.22c0-.11.1-.22.14-.33a.13.13 0 0 0 0-.06 2.68 2.68 0 0 0 .21-.34v-.1a.31.31 0 0 0 0-.1s0-.08 0-.13 0-.05 0-.07zm-9.71 5.85c-8.55 9.47-18.92 18.73-37.29 18.73s-28.74-9.26-37.28-18.73l-5-5.85h-.4l5.4-5.84c8.54-9.48 18.91-18.73 37.28-18.73s28.74 9.25 37.28 18.73l5 5.84h.4z"/>
//  <circle cx="46.8" cy="28.57" r="12" stroke="#000" stroke-width="4"/>
// </svg>

//SCSS
@function vw($size){
  @return $size / 1280 * 100vw;
}

class EyeIcon {
  constructor() {
    this.$btn = document.querySelector('#jsFB');
    this.$eye = this.$btn.querySelector('circle');
        this.onResize();
        window.addEventListener('resize', () => {
            this.onResize();
        });
        this.moveBall();
    }
    onResize() {
        this.btnRect = this.$btn.getBoundingClientRect();
    this.btnWidth = this.btnRect.width;
    this.btnHeight = this.btnRect.height;
    this.btnLeft = this.btnRect.left + this.btnWidth / 2;
    this.btnTop = this.btnRect.top + this.btnHeight / 2;
    }
    moveBall() {
        window.addEventListener('mousemove', (e) => {
            const clientX = e.clientX;
            const clientY = e.clientY;
            const radian = Math.atan2( clientY - this.btnTop, clientX - this.btnLeft );
            // console.log(this.btnTop);
            // console.log('radian: ' + radian, 'degree: ' + radian * ( 180 / Math.PI ) );
            gsap.to(this.$eye, {
                duration: 0.6,
                ease: 'power2.out',
                x: Math.cos(radian) * 5,
                y: Math.sin(radian) * 5
            });
        });
    }
}

new EyeIcon()