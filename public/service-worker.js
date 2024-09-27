const staticCacheName = "static-cache-v1";

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(staticCacheName).then(function (cache) {
      return cache.addAll([
        '/views/offline.html',
        '/views/404.html',
        'app.js',
        'manifest.json',
        '/',
        '/css/icons/icon-144x144.png',
        '/css/icons/icon-512x512.png',
        '/css/icons/maskable_icon.png',
        '/css/icons/delete.png',
        '/css/icons/microphone.png',
        '/css/icons/record.png',
        '/css/icons/stop.png',
        '/css/icons/upload.png',
        '/css/style.css'
      ]);
    })
  );
});

self.addEventListener
  ("activate", (event) => {
    const cacheWhitelist = [staticCacheName];
    event.waitUntil
      (
        caches.keys().then((cacheNames) => {
          return Promise.all
            (
              cacheNames.map((cacheName) => {
                if (cacheWhitelist.indexOf(cacheName) === -1) {
                  return caches.delete(cacheName);
                }
              })
            );
        })
      );
  });

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.url.includes('.wav')) {
    event.respondWith(fetch(request));
  } else {
    event.respondWith
      (
        caches
          .match(event.request
          )
          .then((response) => {
            if (response) {
              return response;
            }
            return fetch(event.request).then((response) => {
              if (response.status === 404) {
                return caches.match
                  ("404.html");
              }
              return caches.open(staticCacheName).then((cache) => {
                cache.put(event.request.url, response.clone());
                return response;
              });
            });
          })
          .catch((error) => {
            return caches.match
              ("offline.html");
          })
      );
  }
});

self.addEventListener('sync', function (event) {
  if (event.tag === 'uploadRecordings') {
    event.waitUntil(uploadRecordings()
      .then(function () {
        console.log("upload complete");
        return self.registration.showNotification('Upload completed!', {
          body: 'Your recordings have been uploaded.',
          icon: '/css/icons/icon-144x144.png'
        });
      })
      .catch(function (err) {
        console.error('Error uploading recordings:', err);
      })
    );
  }
});
function uploadRecordings() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RecordingsDB', 1);

    request.onerror = function (event) {
      console.error('Database error: ', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(['recordings'], 'readwrite');
      const objectStore = transaction.objectStore('recordings');
      const uploadPromises = [];
      const recordsToDelete = []; // Array to store keys of records to be deleted

      objectStore.openCursor().onsuccess = function (cursorEvent) {
        const cursor = cursorEvent.target.result;

        if (cursor) {
          const record = cursor.value;
          console.log('Record:', record);
          const uploadPromise = uploadRec(record);
          uploadPromises.push(uploadPromise);
          recordsToDelete.push(cursor.primaryKey); // Store key for deletion
          cursor.continue();
        } else {
          Promise.all(uploadPromises)
            .then(() => {
              console.log('All records uploaded successfully');
              // After successful upload, delete records
              const deleteTransaction = db.transaction(['recordings'], 'readwrite');
              const deleteObjectStore = deleteTransaction.objectStore('recordings');
              recordsToDelete.forEach(key => {
                deleteObjectStore.delete(key);
              });
              deleteTransaction.oncomplete = () => {
                console.log('Records deleted successfully');
                resolve();
              };
              deleteTransaction.onerror = (error) => {
                console.error('Error deleting records:', error.target.error);
                reject(error.target.error);
              };
            })
            .catch((error) => {
              console.error('Error uploading records:', error);
              reject(error);
            });
        }
      };
    };
  });
}

async function uploadRec(recording) {
  const formData = new FormData()
  formData.append('name', recording.name)
  formData.append('blob', recording.blob)

  fetch('/upload', {
    method: 'POST',
    body: formData,

  })
    .then(response => {
      if (response.ok) {
        console.log('File uploaded successfully!');
      } else {
        console.error('File upload failed.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
}
