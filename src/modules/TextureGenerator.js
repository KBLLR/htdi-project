import * as THREE from 'three'
import { collectionTitles, topics } from '@data/data.js'

class TextureGenerator {
  constructor() {
    this.uiTitle = document.getElementById("ui-title");
    this.uiColTitle = document.getElementById("ui-col-title");
    this.Template = "https://unsplash.com/photos/QwoNAhbmLLo";
    this.anisotropyLevel = 16;
    this.wildCard = null;
    this.currentTopicIndex = 0;
  }

  updateUITitle() {
    this.currentTopicIndex = Math.floor(Math.random() * collectionTitles.length);

    const currentCollection = collectionTitles[this.currentTopicIndex];
    this.uiTitle.textContent = currentCollection;

    const randomWord = this.getRandomWordFromCollection(currentCollection);
    this.uiColTitle.textContent = randomWord;
  }
  getRandomTopic() {
    const topicArray = topics[this.currentTopicIndex];
    if (!topicArray || topicArray.length === 0) {
      console.error("Invalid or empty topic array.");
      return null;
    }
    return topicArray[Math.floor(Math.random() * topicArray.length)];
  }

  getRandomWordFromCollection(collectionTitle) {
    const collectionIndex = collectionTitles.indexOf(collectionTitle);
    if (collectionIndex === -1) {
      console.error("Collection title not found.");
      return null;
    }
    const topicArray = topics[collectionIndex];
    if (!topicArray || topicArray.length === 0) {
      console.error("Invalid or empty topic array.");
      return null;
    }
    return topicArray[Math.floor(Math.random() * topicArray.length)];
  }

  i_texture(wildcard = "topic", repeat = (1, 1)) {
    const path = `https://source.unsplash.com/random/?${wildcard}`
    const preload = new THREE.TextureLoader().load(
      path ? path : this.Template,
      (e) => {
        e.mapping = THREE.EquirectangularRefractionMapping;
        e.anisotropy = this.anisotropyLevel;
        e.magFilter = THREE.NearestFilter;
        e.minFilter = THREE.LinearMipmapLinearFilter;
        e.wrapS = e.wrapT = THREE.MirroredRepeatWrapping;
        e.type = THREE.HalfFloatType;
        e.format = THREE.RGBAFormat;
        e.repeat.set(repeat, repeat);
        e.generateMipmaps = true;
        e.needsUpdate = true;
        e.dispose();
      }
    );
    console.log(preload);
    return preload;
  }

  g_texture(wildcard = "topic", repeat = (4, 16)) {
    const path = `https://source.unsplash.com/random/?${wildcard}`
    const preload = new THREE.TextureLoader().load(
      path ? path : this.Template,
      (e) => {
        e.mapping = THREE.EquirectangularRefractionMapping;
        e.anisotropy = this.anisotropyLevel;
        e.magFilter = THREE.NearestFilter;
        e.minFilter = THREE.LinearMipmapLinearFilter;
        e.wrapS = e.wrapT = THREE.MirroredRepeatWrapping;
        e.type = THREE.HalfFloatType;
        e.format = THREE.RGBAFormat;
        e.repeat.set(repeat, repeat);
        e.generateMipmaps = true;
        e.needsUpdate = true;
        e.dispose();
      }
    );
    console.log(preload);
    return preload;
  }
}

export { TextureGenerator };
