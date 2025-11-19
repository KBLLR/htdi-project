// src/integrations/leAgentDiaryBridge.js
import { validateSceneJson } from './leAgentDiarySceneSchema.js';

/**
 * LeAgentDiaryBridge
 * Responsible for:
 *  - validating scenes
 *  - sending them to LeAgentDiary API
 */
export class LeAgentDiaryBridge {
  constructor({ baseUrl, apiKey }) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async pushScene(sceneJson) {
    const valid = validateSceneJson(sceneJson);

    const res = await fetch(`${this.baseUrl}/v1/stages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.apiKey ? `Bearer ${this.apiKey}` : undefined
      },
      body: JSON.stringify(valid)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[LeAgentDiaryBridge] Failed to push scene: ${res.status} ${text}`);
    }

    return res.json();
  }

  async fetchScene(sceneId) {
    const res = await fetch(`${this.baseUrl}/v1/stages/${sceneId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.apiKey ? `Bearer ${this.apiKey}` : undefined
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[LeAgentDiaryBridge] Failed to fetch scene: ${res.status} ${text}`);
    }

    const sceneJson = await res.json();
    return validateSceneJson(sceneJson);
  }

  async listScenes(agentId) {
    const url = new URL(`${this.baseUrl}/v1/stages`);
    if (agentId) {
      url.searchParams.set('agentId', agentId);
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.apiKey ? `Bearer ${this.apiKey}` : undefined
      }
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[LeAgentDiaryBridge] Failed to list scenes: ${res.status} ${text}`);
    }

    return res.json();
  }
}
