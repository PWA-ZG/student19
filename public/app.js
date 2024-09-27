let recorder;
let audioChunks = [];

//indexedDB.deleteDatabase('RecordingsDB')

document.addEventListener('DOMContentLoaded', function () {
  const startRecordButton = document.getElementById('startRecord');
  const stopRecordButton = document.getElementById('stopRecord');
  const saveRecordingButton = document.getElementById('saveRecording');


  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
        requestNotificationPermission();
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {

    startRecordButton.addEventListener('click', startRecording);
    stopRecordButton.addEventListener('click', stopRecording);

    saveRecordingButton.addEventListener('click', function (event) {
      if ("serviceWorker" in navigator && "SyncManager" in window && 'Notification' in window) {
        if (audioPlayer.src) {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const recordingName = document.getElementById('recordingName').value.trim();

          if (recordingName === '') {
            alert('Please enter a recording name');
            return;
          }

          var recName = recordingName + '.wav'
          const recordingObject = {
            name: recName,
            blob: audioBlob
          };

          saveRecordingToIndexedDB(recordingObject)

          navigator.serviceWorker.ready
            .then(function (registration) {
              return registration.sync.register('uploadRecordings');
            })
            .then(function () {
              console.log('Background sync registered!');
            })
        }
      }
    });

    console.log("start, stop, save are available!");

  } else {
    startRecordButton.disabled = true;
    stopRecordButton.disabled = true;
    saveRecordingButton.disabled = true;
    console.log("start, stop, save are disabled!");
  }

  const audioPlayer = document.getElementById('audioPlayer');
  const deleteRecordingButton = document.getElementById('deleteRecording');
  const recName = document.getElementById("recordingName");

  deleteRecordingButton.addEventListener('click', deleteRecording);

  const recordingIndicator = document.getElementById('recordingIndicator');

  let isRecording = false;

  async function startRecording() {
    if (!isRecording) {
      isRecording = true;
      recordingIndicator.style.visibility = 'visible';
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new MediaRecorder(stream);

        recorder.addEventListener('dataavailable', event => {
          audioChunks.push(event.data);
        });

        recorder.addEventListener('stop', () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          audioPlayer.src = URL.createObjectURL(audioBlob);
        });

        recorder.start();
      } catch (err) {
        console.error('Error accessing microphone:', err);
      }
    }
  }

  function stopRecording() {
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      isRecording = false;
      recordingIndicator.style.visibility = 'hidden';

      recName.style.display = "block";
    }
  }

  function deleteRecording() {
    audioChunks = [];
    audioPlayer.src = '';
    showHideNameRec();
    alert("Deleted current recording from player!");
  }

  recName.style.display = "none";

  function showHideNameRec() {
    var x = document.getElementById("recordingName");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }
});

function saveRecordingToIndexedDB(recordingObject) {
  const request = indexedDB.open('RecordingsDB', 1);

  request.onerror = function (event) {
    console.error('IndexedDB error:', event.target.errorCode);
  };

  request.onupgradeneeded = function (event) {
    const db = event.target.result;
    
    // Kreiranje object store-a
    const objectStore = db.createObjectStore('recordings', { keyPath: 'name' });
  };

  request.onsuccess = function (event) {
    const db = event.target.result;
    const transaction = db.transaction(['recordings'], 'readwrite');
    const objectStore = transaction.objectStore('recordings');
    
    
    // Pohranjivanje 'recordingObject' u IndexedDB
  

    // Pohranjivanje 'recordingObject' u IndexedDB
    const addRequest = objectStore.add(recordingObject);

    addRequest.onsuccess = function (event) {
      console.log('Recording added to IndexedDB:', recordingObject);
    };

    addRequest.onerror = function (event) {
      console.error('Error adding recording to IndexedDB:', event.target.errorCode);
    };
  };
}
const audioList = document.getElementById('audioList');

fetch('/audioList') // Fetch the list of audio files from the server
  .then(response => response.json())
  .then(audioFiles => {
    audioFiles.forEach(file => {
      const audioElement = document.createElement('audio');
      audioElement.controls = true;
      audioElement.src = `/uploads/${file}`; // Path to your audio files

      const fileNameElement = document.createElement('p');
      fileNameElement.textContent = file; // Display the file name

      const audioContainer = document.createElement('div');
      audioContainer.appendChild(fileNameElement);
      audioContainer.appendChild(audioElement);

      audioList.appendChild(audioContainer);
    });
  })
  .catch(error => {
    console.error('Error fetching audio files:', error);
  });

function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(function (permission) {
      if (permission === 'granted') {
        console.log('Notification permission granted');
      } else if (permission === 'denied') {
        console.warn('Notification permission denied');
      }
    });
  } else {
    console.error('Notifications not supported in this browser');
  }
}
