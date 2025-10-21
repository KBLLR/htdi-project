import { SVG } from '@svgdotjs/svg.js'
import { SVG, extend as SVGextend, Element as SVGElement } from '@svgdotjs/svg.js'
import { gsap } from 'gsap'
import { easePack } from 'gsap'

////////////////////////////////////////////////////////////////////
// SVG Animations
///////////////////////////////////////////

var draw = SVG().addTo('body').size(800, 800)
var rect = draw.rect(800, 800).attr({ fill: '#06' })

SVG.on(document, 'DOMContentLoaded', function() {
  var draw = SVG().addTo('body')
})

gsap.timeline()
  .set('.logo', { x: 215, y: 482 })
  .set('.chip', { x: 148, y: 66 })
  .set('.knot', { x: 22, y: 250 })
  .set('.numTxt', { x: 22, y: 375 })
  .set('.nameTxt', { x: 22, y: 410 })
  .add(centerMain(), 0.2)
  .from('.ball', {
    duration: 2,
    transformOrigin: '50% 50%',
    scale: 0,
    opacity: 0,
    ease: 'elastic',
    stagger: 0.2
  }, 0)
  .fromTo('.card', {
    x: 200,
    y: 40,
    transformOrigin: '50% 50%',
    rotation: -4,
    skewX: 10,
    skewY: 4,
    scale: 2,
    opacity: 0
  }, {
    duration: 1.3,
    skewX: 0,
    skewY: 0,
    scale: 1,
    opacity: 1,
    ease: 'power4.inOut'
  }, 0.2)


function centerMain() { gsap.set('.main', { x: '50%', xPercent: -50, y: '50%', yPercent: -50 }); }
window.onresize = centerMain;

window.onmousemove = (e) => {
  let winPercent = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
    distFromCenter = 1 - Math.abs((e.clientX - window.innerWidth / 2) / window.innerWidth * 2);

  gsap.timeline({ defaults: { duration: 0.5, overwrite: 'auto' } })
    .to('.card', { rotation: -7 + 9 * winPercent.x }, 0)
    .to('.fillLight', { opacity: distFromCenter }, 0)
    .to('.bg', { x: 100 - 200 * winPercent.x, y: 20 - 40 * winPercent.y }, 0)
}

////////////////////////////////////////////////////////////////////
// SVG Filters to compose a Volumetric SVG - 
// extracted from https://www.w3.org/TR/filter-effects/
///////////////////////////////////////////


<filter id="RT-01" filterUnits="userSpaceOnUse" x="0" y="-283" width="566" height="1132">
  <desc>Produces a 3D lighting effect.</desc>
  <feGaussianBlur in="SourceAlpha" stdDeviation="4" result="blur"/>
  <feOffset in="blur" dx="4" dy="4" result="offsetBlur"/>
  <feSpecularLighting in="blur" surfaceScale="5" specularConstant=".75"
                      specularExponent="20" lighting-color="#bbbbbb"
                      result="specOut">
    <fePointLight x="-5000" y="-10000" z="20000"/>
  </feSpecularLighting>
  <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut"/>
  <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic"
               k1="0" k2="1" k3="1" k4="0" result="litPaint"/>
  <feMerge>
    <feMergeNode in="offsetBlur"/>
    <feMergeNode in="litPaint"/>
  </feMerge>
</filter>
