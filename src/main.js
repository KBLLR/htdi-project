import './css/style.css';
import './css/MyFontsWebfontsKit.css';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';
import 'tippy.js/dist/backdrop.css';
import 'tippy.js/animations/shift-away.css';
import 'tippy.js/themes/translucent.css';

import trackOne from '../assets/sounds/ES_Lucid_Space-Joseph_Beg.ogg';
import trackTwoOgg from '../assets/sounds/344_audio/Lo-Fi_Rumble.ogg';
import trackTwoMp3 from '../assets/sounds/344_audio/Lo-Fi_Rumble.mp3';

import './script.js';

const music = document.getElementById('music');
if (music) {
  music.src = trackOne;
}

const musicTwo = document.getElementById('music2');
if (musicTwo) {
  musicTwo.innerHTML = '';
  const sources = [
    { src: trackTwoOgg, type: 'audio/ogg' },
    { src: trackTwoMp3, type: 'audio/mp3' }
  ];

  sources.forEach(({ src, type }) => {
    const source = document.createElement('source');
    source.src = src;
    source.type = type;
    musicTwo.appendChild(source);
  });
}
