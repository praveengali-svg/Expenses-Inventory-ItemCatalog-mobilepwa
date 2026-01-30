
/* global google, gapi */
// Global declarations for Google APIs
declare var google: any;
declare var gapi: any;

export interface GoogleDriveFile {
  base64: string;
  mimeType: string;
  name: string;
}

const CLIENT_ID = (process.env as any).GOOGLE_CLIENT_ID || '';
const API_KEY = process.env.API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
const SYNC_FILENAME = 'voltx_vault_sync.json';

let accessToken: string | null = null;
let tokenClient: any = null;

const initTokenClient = () => {
  return new Promise<void>((resolve) => {
    if (tokenClient) return resolve();
    
    if (typeof google === 'undefined' || !google.accounts) {
      console.error("Google GIS library not loaded");
      return resolve();
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error !== undefined) {
          throw response;
        }
        accessToken = response.access_token;
        resolve();
      },
    });
    resolve();
  });
};

const getToken = () => {
  return new Promise<string>((resolve, reject) => {
    if (accessToken) return resolve(accessToken);
    
    if (!tokenClient) {
      return reject(new Error("Token client not initialized"));
    }

    tokenClient.callback = (response: any) => {
      if (response.error !== undefined) {
        return reject(response);
      }
      accessToken = response.access_token;
      resolve(accessToken!);
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

const loadGapi = () => {
  return new Promise<void>((resolve) => {
    if (typeof gapi === 'undefined') {
      console.error("GAPI library not loaded");
      return resolve();
    }
    gapi.load('client:picker', resolve);
  });
};

export const googleDriveService = {
  uploadSyncFile: async (vaultData: any): Promise<void> => {
    await initTokenClient();
    const token = await getToken();
    
    // 1. Search for existing file
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${SYNC_FILENAME}' and trashed=false&fields=files(id)`;
    const searchResp = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
    const { files } = await searchResp.json();
    
    const fileContent = JSON.stringify(vaultData);
    const metadata = { name: SYNC_FILENAME, mimeType: 'application/json' };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));

    let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (files && files.length > 0) {
      url = `https://www.googleapis.com/upload/drive/v3/files/${files[0].id}?uploadType=multipart`;
      method = 'PATCH';
    }

    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });

    if (!response.ok) throw new Error("Cloud sync upload failed");
  },

  downloadSyncFile: async (): Promise<any | null> => {
    await initTokenClient();
    const token = await getToken();
    
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${SYNC_FILENAME}' and trashed=false&fields=files(id)`;
    const searchResp = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
    const { files } = await searchResp.json();
    
    if (!files || files.length === 0) return null;

    const fileUrl = `https://www.googleapis.com/drive/v3/files/${files[0].id}?alt=media`;
    const response = await fetch(fileUrl, { headers: { Authorization: `Bearer ${token}` } });
    
    if (!response.ok) return null;
    return await response.json();
  },

  pickFile: async (): Promise<GoogleDriveFile | null> => {
    if (!CLIENT_ID) {
      alert("Google Client ID not configured.");
      return null;
    }

    try {
      await loadGapi();
      await initTokenClient();
      const token = await getToken();

      return new Promise((resolve) => {
        const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
        view.setMimeTypes('image/png,image/jpeg,application/pdf');

        const picker = new google.picker.PickerBuilder()
          .enableFeature(google.picker.Feature.NAV_HIDDEN)
          .setDeveloperKey(API_KEY)
          .setAppId(CLIENT_ID.split('-')[0])
          .setOAuthToken(token)
          .addView(view)
          .setCallback(async (data: any) => {
            if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
              const doc = data[google.picker.Response.DOCUMENTS][0];
              const fileId = doc.id;
              const fileName = doc.name;
              const mimeType = doc.mimeType;

              const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { Authorization: `Bearer ${token}` }
              });

              const blob = await response.blob();
              const reader = new FileReader();
              reader.onload = () => {
                resolve({ base64: reader.result as string, mimeType, name: fileName });
              };
              reader.readAsDataURL(blob);
            } else if (data[google.picker.Response.ACTION] === 'cancel') {
              resolve(null);
            }
          })
          .build();
        picker.setVisible(true);
      });
    } catch (error) {
      console.error("Google Drive picking failed", error);
      return null;
    }
  }
};
