import { LLMConfig } from '../types';

const BASE_URL = 'http://localhost:8000/api';

export const API_ENDPOINTS = {
  UPLOAD: `${BASE_URL}/upload`,
  CONFIG: `${BASE_URL}/config`,
};

export async function fetchConfig() {
  const response = await fetch(API_ENDPOINTS.CONFIG);
  if (!response.ok) {
    throw new Error('获取配置失败');
  }
  return response.json();
}

export async function updateConfig(config: LLMConfig) {
  const response = await fetch(API_ENDPOINTS.CONFIG, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error('更新配置失败');
  }
  return response.json();
}

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(API_ENDPOINTS.UPLOAD, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('文件上传失败');
  }
  return response.json();
}