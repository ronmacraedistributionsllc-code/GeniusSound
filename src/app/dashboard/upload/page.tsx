'use client';

import { useState, useRef } from 'react';
import { Upload, FileAudio, X, Play, Music } from 'lucide-react';

interface AudioFile {
  file: File;
  previewUrl: string;
}

export default function UploadPage() {
  const [dragActive, setDragActive] = useState(false);
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newFiles: AudioFile[] = [];
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('audio/')) {
        const previewUrl = URL.createObjectURL(file);
        newFiles.push({ file, previewUrl });
      }
    });
    
    setAudioFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setAudioFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    setUploading(true);
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          return 100;
        }
        return prev + 5;
      });
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      setUploading(false);
      setProgress(100);
    }, 2500);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Upload Audio</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Upload your audio files to start creating music videos
        </p>
      </header>

      {/* Drag & Drop Upload */}
      <div 
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' 
            : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="audio/*"
          multiple
          onChange={handleChange}
        />

        <div className="mb-4">
          {uploading ? (
            <div className="w-20 h-20 mx-auto bg-blue-500 rounded-full flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-white rounded-full animate-spin" />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-blue-500">
              <Upload className="w-10 h-10" />
            </div>
          )}
        </div>

        <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
          {uploading ? 'Uploading...' : 'Drag & Drop Audio Files'}
        </h3>
        
        {!uploading && (
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            or click to browse
          </p>
        )}

        {!uploading && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Select Files
          </button>
        )}

        {uploading && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-600 dark:text-zinc-400">Uploading</span>
              <span className="font-medium text-blue-500">{progress}%</span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Audio Files List */}
      {audioFiles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Selected Files ({audioFiles.length})
          </h2>
          
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            {audioFiles.map((audio, index) => (
              <div 
                key={index} 
                className="flex items-center gap-4 p-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white">
                  <FileAudio className="w-6 h-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-900 dark:text-white truncate">
                    {audio.file.name}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <span>{formatFileSize(audio.file.size)}</span>
                    <span>•</span>
                    <span>{audio.file.type.split('/')[1]}</span>
                  </div>
                </div>

                <button 
                  onClick={() => removeFile(index)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Total: {audioFiles.length} file{audioFiles.length !== 1 && 's'}
              </div>
              
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                {uploading ? 'Uploading...' : 'Upload Selected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Supported Formats', value: 'MP3, WAV, FLAC, AAC, OGG' },
          { label: 'Max File Size', value: '50 MB per file' },
          { label: 'Processing Time', value: '~1-3 minutes per song' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-zinc-200 dark:border-zinc-800">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{stat.label}</p>
            <p className="text-lg font-medium text-zinc-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
