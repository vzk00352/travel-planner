import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Calendar, MapPin, MessageSquare, ChevronDown, ChevronUp, Send, Paperclip, Link, Image } from 'lucide-react';

const TravelPlannerApp = () => {
  const [currentView, setCurrentView] = useState('trips');
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatAttachment, setChatAttachment] = useState(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isSharedView, setIsSharedView] = useState(false);
  const [sharedTripId, setSharedTripId] = useState(null);
  const [userName, setUserName] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [unreadCounts, setUnreadCounts] = useState({});

  // 初期データの読み込み
  useEffect(() => {
    const savedTrips = JSON.parse(localStorage.getItem('travelPlannerTrips') || '[]');
    setTrips(savedTrips);
    
    // 通知権限の初期状態を取得
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    
    // URLから共有IDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    
    if (shareId) {
      const sharedTrip = savedTrips.find(trip => trip.id.toString() === shareId);
      if (sharedTrip) {
        setIsSharedView(true);
        setSharedTripId(shareId);
        setSelectedTrip(sharedTrip);
        setCurrentView('schedule');
      }
    }
    
    // 添付メニューの外クリック処理
    const handleClickOutside = (event) => {
      if (showAttachmentMenu && !event.target.closest('.attachment-menu')) {
        setShowAttachmentMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAttachmentMenu]);

  // currentViewが変更された時の処理
  useEffect(() => {
    if (currentView === 'chat' && selectedTrip) {
      // チャット画面に入った時に未読カウントをリセット
      updateUnreadCount(selectedTrip.id, 0);
    }
  }, [currentView, selectedTrip]);

  // データの保存
  useEffect(() => {
    localStorage.setItem('travelPlannerTrips', JSON.stringify(trips));
  }, [trips]);

  // 通知関連のユーティリティ関数
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return 'denied';
  };

  const showBrowserNotification = (title, options = {}) => {
    if (notificationPermission === 'granted' && 'Notification' in window) {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 自動で5秒後に閉じる
      setTimeout(() => notification.close(), 5000);
    }
  };

  const addAppNotification = (message) => {
    const notification = {
      id: Date.now(),
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => [notification, ...prev]);
    
    // 5秒後に自動削除
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  };

  const updateUnreadCount = (tripId, count) => {
    setUnreadCounts(prev => ({
      ...prev,
      [tripId]: count
    }));
  };

  // 参加者の色を生成する関数
  const getParticipantColor = (participant, participants) => {
    const colors = [
      { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
      { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500' },
      { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500' },
      { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', dot: 'bg-pink-500' },
      { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', dot: 'bg-yellow-500' },
      { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
      { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500' },
      { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' }
    ];
    
    const index = participants.indexOf(participant);
    return colors[index % colors.length];
  };

  // 不参加者の色
  const getInactiveColor = () => ({
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-200',
    dot: 'bg-gray-400'
  });

  // ファイル処理とURL検出のユーティリティ関数
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const isImageFile = (file) => {
    return file && file.type && file.type.startsWith('image/');
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const extractUrlsFromText = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  // Google Maps関連のユーティリティ関数
  const isGoogleMapsUrl = (url) => {
    if (!url) return false;
    return url.includes('maps.google.com') || url.includes('goo.gl/maps') || url.includes('maps.app.goo.gl');
  };

  const extractLocationFromGoogleMaps = (url) => {
    if (!isGoogleMapsUrl(url)) return null;
    
    try {
      const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (atMatch) {
        return {
          lat: parseFloat(atMatch[1]),
          lng: parseFloat(atMatch[2])
        };
      }
      
      const urlObj = new URL(url);
      const params = new URLSearchParams(urlObj.search);
      const query = params.get('q');
      if (query) {
        return { name: query };
      }
      
      return null;
    } catch (e) {
      return null;
    }
  };

  const generateGoogleMapsUrl = (location) => {
    if (location.lat && location.lng) {
      return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    } else if (location.name) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.name)}`;
    }
    return null;
  };

  const generateDirectionsUrl = (from, to) => {
    const fromStr = from.lat ? `${from.lat},${from.lng}` : encodeURIComponent(from.name || '現在地');
    const toStr = to.lat ? `${to.lat},${to.lng}` : encodeURIComponent(to.name || '');
    return `https://www.google.com/maps/dir/${fromStr}/${toStr}`;
  };

  // 新しい旅行を作成
  const createTrip = (tripData) => {
    const newTrip = {
      id: Date.now(),
      ...tripData,
      schedules: [],
      chat: [],
      createdAt: new Date().toISOString()
    };
    setTrips([...trips, newTrip]);
  };

  // 旅行を編集
  const updateTrip = (tripId, updates) => {
    setTrips(trips.map(trip => 
      trip.id === tripId ? { ...trip, ...updates } : trip
    ));
  };

  // 旅行を削除
  const deleteTrip = (tripId) => {
    setTrips(trips.filter(trip => trip.id !== tripId));
    if (selectedTrip && selectedTrip.id === tripId) {
      setSelectedTrip(null);
      setCurrentView('trips');
    }
  };

  // スケジュールを追加
  const addSchedule = (scheduleData) => {
    console.log('新しいスケジュール:', scheduleData);
    const newSchedule = {
      id: Date.now(),
      ...scheduleData,
      createdAt: new Date().toISOString()
    };
    
    const updatedTrip = {
      ...selectedTrip,
      schedules: [...(selectedTrip.schedules || []), newSchedule]
    };
    
    updateTrip(selectedTrip.id, {
      schedules: updatedTrip.schedules
    });
    setSelectedTrip(updatedTrip);
  };

  // スケジュールを更新
  const updateSchedule = (scheduleId, updates) => {
    const updatedSchedules = selectedTrip.schedules.map(schedule =>
      schedule.id === scheduleId ? { ...schedule, ...updates } : schedule
    );
    updateTrip(selectedTrip.id, { schedules: updatedSchedules });
    setSelectedTrip({ ...selectedTrip, schedules: updatedSchedules });
  };

  // スケジュールを削除
  const deleteSchedule = (scheduleId) => {
    const updatedSchedules = selectedTrip.schedules.filter(schedule => schedule.id !== scheduleId);
    updateTrip(selectedTrip.id, { schedules: updatedSchedules });
    setSelectedTrip({ ...selectedTrip, schedules: updatedSchedules });
  };

  // チャットメッセージを送信
  const sendMessage = async () => {
    if (!chatMessage.trim() && !chatAttachment) return;
    
    let senderName = userName;
    if (!senderName && isSharedView) {
      senderName = prompt('お名前を入力してください:');
      if (senderName) {
        setUserName(senderName);
      } else {
        return;
      }
    } else if (!senderName) {
      senderName = 'あなた';
    }
    
    let attachmentData = null;
    if (chatAttachment) {
      if (chatAttachment.type === 'image') {
        attachmentData = {
          type: 'image',
          data: await convertFileToBase64(chatAttachment.file),
          name: chatAttachment.file.name,
          size: chatAttachment.file.size
        };
      } else if (chatAttachment.type === 'url') {
        attachmentData = {
          type: 'url',
          url: chatAttachment.url,
          title: chatAttachment.title || chatAttachment.url
        };
      }
    }
    
    // テキスト内のURLを検出
    const urls = extractUrlsFromText(chatMessage);
    
    const newMessage = {
      id: Date.now(),
      text: chatMessage,
      sender: senderName,
      timestamp: new Date().toISOString(),
      read: false,
      attachment: attachmentData,
      urls: urls
    };
    
    const updatedChat = [...(selectedTrip.chat || []), newMessage];
    updateTrip(selectedTrip.id, { chat: updatedChat });
    setSelectedTrip({ ...selectedTrip, chat: updatedChat });
    
    // 通知を送信
    if (currentView === 'chat') {
      // チャット画面にいる場合はアプリ内通知のみ
      addAppNotification(`${senderName}がメッセージを送信しました`);
    } else {
      // 他の画面にいる場合はブラウザ通知も送信
      const notificationText = chatMessage.length > 30 
        ? chatMessage.substring(0, 30) + '...' 
        : chatMessage;
      
      showBrowserNotification(
        `${selectedTrip.name} - ${senderName}`,
        {
          body: attachmentData 
            ? (attachmentData.type === 'image' ? '📷 画像を送信しました' : '🔗 URLを送信しました')
            : notificationText,
          tag: `chat-${selectedTrip.id}`
        }
      );
      
      addAppNotification(`${selectedTrip.name}: ${senderName}からメッセージ`);
    }
    
    setChatMessage('');
    setChatAttachment(null);
    setShowAttachmentMenu(false);
  };

  // チャットメッセージコンポーネント
  const ChatMessage = ({ message }) => {
    const renderAttachment = () => {
      if (!message.attachment) return null;
      
      if (message.attachment.type === 'image') {
        return (
          <div className="mt-2">
            <img
              src={message.attachment.data}
              alt={message.attachment.name}
              className="max-w-48 max-h-48 rounded-lg border border-gray-200 cursor-pointer"
              onClick={() => {
                // 画像を新しいタブで開く
                const newWindow = window.open();
                newWindow.document.write(`<img src="${message.attachment.data}" style="max-width:100%; max-height:100vh;" />`);
              }}
            />
            <p className="text-xs text-gray-500 mt-1">{message.attachment.name}</p>
          </div>
        );
      }
      
      if (message.attachment.type === 'url') {
        return (
          <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-2">
            <div className="flex items-center gap-2">
              <Link size={14} className="text-blue-600" />
              <a
                href={message.attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
              >
                {message.attachment.title}
              </a>
            </div>
          </div>
        );
      }
      
      return null;
    };
    
    const renderUrls = () => {
      if (!message.urls || message.urls.length === 0) return null;
      
      return (
        <div className="mt-2 space-y-1">
          {message.urls.map((url, index) => (
            <div key={index} className="bg-gray-50 border border-gray-200 rounded-md p-2">
              <div className="flex items-center gap-2">
                <Link size={14} className="text-gray-600" />
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {url}
                </a>
              </div>
            </div>
          ))}
        </div>
      );
    };
    
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex items-center gap-1">
            {selectedTrip?.participants?.includes(message.sender) && (
              <div className={`w-3 h-3 rounded-full ${getParticipantColor(message.sender, selectedTrip.participants).dot}`}></div>
            )}
            <span className={`text-sm font-medium ${
              selectedTrip?.participants?.includes(message.sender)
                ? getParticipantColor(message.sender, selectedTrip.participants).text
                : 'text-gray-700'
            }`}>
              {message.sender}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleString()}
          </span>
        </div>
        <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
          {message.text && (
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.text}</p>
          )}
          {renderAttachment()}
          {renderUrls()}
        </div>
      </div>
    );
  };

  // 通知コンポーネント
  const NotificationBanner = () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    
    if (unreadNotifications.length === 0) return null;
    
    return (
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {unreadNotifications.slice(0, 3).map(notification => (
          <div
            key={notification.id}
            className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg cursor-pointer transform transition-all duration-300 hover:scale-105"
            onClick={() => markNotificationAsRead(notification.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
                <p className="text-xs opacity-90 mt-1">
                  {new Date(notification.timestamp).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markNotificationAsRead(notification.id);
                }}
                className="ml-2 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 通知権限リクエストボタン
  const NotificationPermissionButton = () => {
    if (notificationPermission === 'granted') return null;
    
    return (
      <button
        onClick={requestNotificationPermission}
        className="flex items-center gap-2 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md px-3 py-2 hover:bg-blue-100 transition-colors"
      >
        🔔 通知を有効にする
      </button>
    );
  };

  // 共有URLを生成
  const generateShareUrl = () => {
    const url = `${window.location.origin}${window.location.pathname}?share=${selectedTrip.id}`;
    setShareUrl(url);
    navigator.clipboard.writeText(url);
    alert('共有URLをクリップボードにコピーしました');
  };

  // Google Mapsコンポーネント
  const GoogleMapsIntegration = ({ url, location }) => {
    const mapLocation = extractLocationFromGoogleMaps(url);
    
    if (!isGoogleMapsUrl(url) && !mapLocation) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={16} className="text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Google Maps</span>
        </div>
        
        <div className="space-y-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm text-blue-600 hover:text-blue-800 underline break-all"
          >
            地図を開く
          </a>
          
          {location && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const directionsUrl = generateDirectionsUrl({ name: '現在地' }, mapLocation || { name: location });
                  window.open(directionsUrl, '_blank');
                }}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
              >
                経路を調べる
              </button>
              
              <button
                onClick={() => {
                  const mapsUrl = generateGoogleMapsUrl(mapLocation || { name: location });
                  if (mapsUrl) {
                    navigator.clipboard.writeText(mapsUrl);
                    alert('Google MapsのURLをコピーしました');
                  }
                }}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
              >
                URLをコピー
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 旅行フォームコンポーネント
  const TripForm = ({ trip, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      name: trip?.name || '',
      startDate: trip?.startDate || '',
      endDate: trip?.endDate || '',
      participants: trip?.participants || ['']
    });

    const addParticipant = () => {
      setFormData({
        ...formData,
        participants: [...formData.participants, '']
      });
    };

    const updateParticipant = (index, value) => {
      const newParticipants = [...formData.participants];
      newParticipants[index] = value;
      setFormData({ ...formData, participants: newParticipants });
    };

    const removeParticipant = (index) => {
      setFormData({
        ...formData,
        participants: formData.participants.filter((_, i) => i !== index)
      });
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      const cleanedData = {
        ...formData,
        participants: formData.participants.filter(p => p.trim() !== '')
      };
      onSave(cleanedData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            {trip ? '旅行を編集' : '新しい旅行を作成'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">旅行名</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">参加者</label>
              {formData.participants.map((participant, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={participant}
                    onChange={(e) => updateParticipant(index, e.target.value)}
                    placeholder="参加者名"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                  {formData.participants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="px-3 py-2 text-gray-500 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addParticipant}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
              >
                <Plus size={16} />
                参加者を追加
              </button>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-gray-800 text-white py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                保存
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // スケジュールフォームコンポーネント
  const ScheduleForm = ({ schedule, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      date: schedule?.date || '',
      time: schedule?.time || '',
      title: schedule?.title || '',
      location: schedule?.location || '',
      url: schedule?.url || '',
      memo: schedule?.memo || '',
      participants: schedule?.participants || (selectedTrip?.participants ? [...selectedTrip.participants] : [])
    });

    // 旅行期間の日付を生成
    const getTripDates = () => {
      if (!selectedTrip?.startDate || !selectedTrip?.endDate) return [];
      
      const start = new Date(selectedTrip.startDate);
      const end = new Date(selectedTrip.endDate);
      const dates = [];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      
      return dates;
    };

    const tripDates = getTripDates();

    // 日付フォーマット関数
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    // 日本語の曜日表示
    const getJapaneseDayOfWeek = (date) => {
      const days = ['日', '月', '火', '水', '木', '金', '土'];
      return days[date.getDay()];
    };

    const toggleParticipant = (participant) => {
      const newParticipants = formData.participants.includes(participant)
        ? formData.participants.filter(p => p !== participant)
        : [...formData.participants, participant];
      setFormData({ ...formData, participants: newParticipants });
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      console.log('スケジュール保存データ:', formData);
      onSave(formData);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-6 w-full max-w-md my-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">
            {schedule ? 'スケジュールを編集' : 'スケジュールを追加'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* カレンダー形式の日付選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">日付を選択</label>
              {tripDates.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-2">
                  {tripDates.map((date, index) => {
                    const dateStr = formatDate(date);
                    const isSelected = formData.date === dateStr;
                    const dayOfWeek = getJapaneseDayOfWeek(date);
                    
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => setFormData({ ...formData, date: dateStr })}
                        className={`p-3 text-left rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-gray-800 text-white border-gray-800'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {index + 1}日目
                            </div>
                            <div className="text-sm">
                              {date.getMonth() + 1}/{date.getDate()}({dayOfWeek})
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                  旅行の日程が設定されていません
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">時間</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">場所</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
              {formData.location && (
                <button
                  type="button"
                  onClick={() => {
                    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location)}`;
                    window.open(searchUrl, '_blank');
                  }}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Google Mapsで検索
                </button>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="Google Maps、食べログなど"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                />
                
                {/* Google Maps連携プレビュー */}
                {formData.url && isGoogleMapsUrl(formData.url) && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-2">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-green-600" />
                      <span className="text-xs text-green-800 font-medium">Google Maps URL を検出</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">地図表示と経路案内機能が利用できます</p>
                  </div>
                )}
                
                {/* 場所名からGoogle Maps URLを生成 */}
                {formData.location && !formData.url && (
                  <button
                    type="button"
                    onClick={() => {
                      const mapsUrl = generateGoogleMapsUrl({ name: formData.location });
                      setFormData({ ...formData, url: mapsUrl });
                    }}
                    className="w-full text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-md py-2 hover:bg-blue-100 transition-colors"
                  >
                    場所名からGoogle Maps URLを生成
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">参加者</label>
              <div className="space-y-2">
                {selectedTrip?.participants?.map(participant => {
                  const colors = getParticipantColor(participant, selectedTrip.participants);
                  return (
                    <label key={participant} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.participants.includes(participant)}
                        onChange={() => toggleParticipant(participant)}
                        className="rounded border-gray-300 focus:ring-gray-500"
                      />
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                        <span className={`text-sm ${colors.text}`}>{participant}</span>
                      </div>
                    </label>
                  );
                }) || (
                  <p className="text-sm text-gray-500">参加者が登録されていません</p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
              <textarea
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                rows="3"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={!formData.date}
                className="flex-1 bg-gray-800 text-white py-2 rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                保存
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 削除確認ダイアログ
  const DeleteConfirmDialog = ({ onConfirm, onCancel, message }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm my-8">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">削除の確認</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            削除
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationBanner />
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">旅行計画</h1>
            {isSharedView && (
              <p className="text-sm text-gray-500">共有ビュー</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationPermissionButton />
            {selectedTrip && (
              <div className="flex gap-2">
                {!isSharedView && (
                  <button
                    onClick={generateShareUrl}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                  >
                    共有
                  </button>
                )}
                {!isSharedView && (
                  <button
                    onClick={() => setCurrentView('trips')}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
                  >
                    戻る
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="p-4">
        {currentView === 'trips' && !isSharedView && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">旅行一覧</h2>
              <button
                onClick={() => setEditingTrip({})}
                className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                <Plus size={18} />
                新しい旅行
              </button>
            </div>

            <div className="space-y-4">
              {trips.map(trip => (
                <div key={trip.id} className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-2">{trip.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar size={16} />
                          {trip.startDate} - {trip.endDate}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users size={16} />
                          {trip.participants?.length || 0}人
                        </div>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          スケジュール: {trip.schedules?.length || 0}件
                        </span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          チャット: {trip.chat?.length || 0}件
                        </span>
                      </div>
                      
                      {/* 参加者プレビュー */}
                      {trip.participants && trip.participants.length > 0 && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-1">
                            {trip.participants.slice(0, 4).map(participant => {
                              const colors = getParticipantColor(participant, trip.participants);
                              return (
                                <div
                                  key={participant}
                                  className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${colors.bg} ${colors.text} border ${colors.border}`}
                                >
                                  <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                                  {participant}
                                </div>
                              );
                            })}
                            {trip.participants.length > 4 && (
                              <div className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
                                +{trip.participants.length - 4}人
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingTrip(trip)}
                        className="p-2 text-gray-500 hover:text-gray-700"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(trip.id)}
                        className="p-2 text-gray-500 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTrip(trip);
                      setCurrentView('schedule');
                    }}
                    className="w-full mt-3 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    詳細を見る
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'schedule' && selectedTrip && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{selectedTrip.name}</h2>
                <p className="text-sm text-gray-600">
                  {selectedTrip.startDate} - {selectedTrip.endDate}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    onClick={() => setCurrentView('chat')}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    <MessageSquare size={16} />
                    チャット
                  </button>
                  {unreadCounts[selectedTrip.id] > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCounts[selectedTrip.id]}
                    </div>
                  )}
                </div>
                {!isSharedView && (
                  <button
                    onClick={() => setShowScheduleForm(true)}
                    className="flex items-center gap-2 bg-gray-800 text-white px-3 py-2 rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <Plus size={16} />
                    スケジュール追加
                  </button>
                )}
              </div>
            </div>

            {/* 日程別のスケジュール表示 */}
            <div className="space-y-6">
              {(() => {
                if (!selectedTrip?.startDate || !selectedTrip?.endDate) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <p>旅行の日程が設定されていません。</p>
                    </div>
                  );
                }

                // 旅行期間の日付を生成
                const start = new Date(selectedTrip.startDate);
                const end = new Date(selectedTrip.endDate);
                const tripDays = [];
                
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                  tripDays.push(new Date(d));
                }

                // 日付フォーマット関数
                const formatDate = (date) => {
                  return date.toISOString().split('T')[0];
                };

                // 日本語の曜日表示
                const getJapaneseDayOfWeek = (date) => {
                  const days = ['日', '月', '火', '水', '木', '金', '土'];
                  return days[date.getDay()];
                };

                return tripDays.map((date, dayIndex) => {
                  const dateStr = formatDate(date);
                  const dayOfWeek = getJapaneseDayOfWeek(date);
                  const daySchedules = selectedTrip.schedules
                    ?.filter(schedule => schedule.date === dateStr)
                    ?.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00')) || [];

                  return (
                    <div key={dateStr} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      {/* 日付ヘッダー */}
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center text-sm font-medium">
                              {dayIndex + 1}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800">
                                {dayIndex + 1}日目
                              </h3>
                              <p className="text-sm text-gray-600">
                                {date.getMonth() + 1}月{date.getDate()}日({dayOfWeek})
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-sm text-gray-500">
                              {daySchedules.length}件の予定
                            </div>
                            {/* 一日の経路案内ボタン */}
                            {daySchedules.filter(s => s.url && isGoogleMapsUrl(s.url)).length > 1 && (
                              <button
                                onClick={() => {
                                  const locations = daySchedules
                                    .filter(s => s.url && isGoogleMapsUrl(s.url))
                                    .map(s => extractLocationFromGoogleMaps(s.url) || { name: s.location })
                                    .filter(loc => loc);
                                  
                                  if (locations.length > 1) {
                                    const waypoints = locations.slice(1, -1).map(loc => 
                                      loc.lat ? `${loc.lat},${loc.lng}` : encodeURIComponent(loc.name || '')
                                    ).join('|');
                                    
                                    const start = locations[0];
                                    const end = locations[locations.length - 1];
                                    const startStr = start.lat ? `${start.lat},${start.lng}` : encodeURIComponent(start.name || '');
                                    const endStr = end.lat ? `${end.lat},${end.lng}` : encodeURIComponent(end.name || '');
                                    
                                    const routeUrl = `https://www.google.com/maps/dir/${startStr}/${endStr}${waypoints ? '/' + waypoints : ''}`;
                                    window.open(routeUrl, '_blank');
                                  }
                                }}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                              >
                                一日の経路
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* スケジュール一覧 */}
                      <div className="divide-y divide-gray-100">
                        {daySchedules.length > 0 ? (
                          daySchedules.map(schedule => (
                            <div key={schedule.id} className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    {schedule.time && (
                                      <div className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm font-medium min-w-[60px] text-center">
                                        {schedule.time}
                                      </div>
                                    )}
                                    <h4 className="font-semibold text-gray-800">{schedule.title}</h4>
                                  </div>
                                  
                                  {schedule.location && (
                                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-2 ml-[76px]">
                                      <MapPin size={16} />
                                      <span>{schedule.location}</span>
                                      {schedule.url && isGoogleMapsUrl(schedule.url) && (
                                        <button
                                          onClick={() => window.open(schedule.url, '_blank')}
                                          className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                        >
                                          地図
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* 参加者表示 */}
                                  <div className="ml-[76px]">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Users size={16} className="text-gray-500" />
                                      <span className="text-sm text-gray-600">
                                        参加者 ({schedule.participants?.length || 0}/{selectedTrip.participants?.length || 0}人)
                                      </span>
                                    </div>
                                    
                                    {/* 参加者のアバター表示 */}
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {selectedTrip.participants?.map(participant => {
                                        const isParticipating = schedule.participants?.includes(participant);
                                        const colors = isParticipating 
                                          ? getParticipantColor(participant, selectedTrip.participants)
                                          : getInactiveColor();
                                        
                                        return (
                                          <div
                                            key={participant}
                                            className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${colors.bg} ${colors.text} border ${colors.border}`}
                                          >
                                            <div className={`w-2 h-2 rounded-full ${colors.dot}`}></div>
                                            {participant}
                                          </div>
                                        );
                                      })}
                                    </div>
                                    
                                    {/* 参加状況の概要 */}
                                    {schedule.participants?.length !== selectedTrip.participants?.length && (
                                      <div className="flex gap-1">
                                        {schedule.participants?.length === 0 ? (
                                          <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200">
                                            参加者なし
                                          </span>
                                        ) : schedule.participants?.length < selectedTrip.participants?.length ? (
                                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded border border-yellow-200">
                                            一部参加
                                          </span>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  {!isSharedView && (
                                    <>
                                      <button
                                        onClick={() => setEditingSchedule(schedule)}
                                        className="p-1 text-gray-500 hover:text-gray-700"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button
                                        onClick={() => setShowDeleteConfirm(`schedule-${schedule.id}`)}
                                        className="p-1 text-gray-500 hover:text-red-500"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => setExpandedSchedule(
                                      expandedSchedule === schedule.id ? null : schedule.id
                                    )}
                                    className="p-1 text-gray-500 hover:text-gray-700"
                                  >
                                    {expandedSchedule === schedule.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                </div>
                              </div>
                              
                              {expandedSchedule === schedule.id && (
                                <div className="mt-4 pt-4 border-t border-gray-100 ml-[76px]">
                                  <div className="space-y-3">
                                    {/* 参加者詳細表示 */}
                                    <div>
                                      <h5 className="text-sm font-medium text-gray-700 mb-2">参加者詳細</h5>
                                      <div className="grid grid-cols-1 gap-2">
                                        {selectedTrip.participants?.map(participant => {
                                          const isParticipating = schedule.participants?.includes(participant);
                                          const colors = isParticipating 
                                            ? getParticipantColor(participant, selectedTrip.participants)
                                            : getInactiveColor();
                                          
                                          return (
                                            <div
                                              key={participant}
                                              className={`flex items-center justify-between p-2 rounded border ${colors.bg} ${colors.border}`}
                                            >
                                              <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                                                <span className={`text-sm ${isParticipating ? colors.text + ' font-medium' : colors.text}`}>
                                                  {participant}
                                                </span>
                                              </div>
                                              <span className={`text-xs px-2 py-1 rounded ${
                                                isParticipating 
                                                  ? `${colors.bg} ${colors.text}` 
                                                  : `${colors.bg} ${colors.text}`
                                              }`}>
                                                {isParticipating ? '参加' : '不参加'}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    
                                    {schedule.url && (
                                      <div>
                                        <h5 className="text-sm font-medium text-gray-700 mb-1">URL</h5>
                                        <a
                                          href={schedule.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 text-sm underline break-all"
                                        >
                                          {schedule.url}
                                        </a>
                                        
                                        {/* Google Maps連携 */}
                                        <GoogleMapsIntegration 
                                          url={schedule.url}
                                          location={schedule.location}
                                        />
                                      </div>
                                    )}
                                    
                                    {schedule.memo && (
                                      <div>
                                        <h5 className="text-sm font-medium text-gray-700 mb-1">メモ</h5>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{schedule.memo}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-gray-500">
                            <p className="text-sm">この日の予定はまだありません</p>
                            {!isSharedView && (
                              <button
                                onClick={() => setShowScheduleForm(true)}
                                className="mt-2 text-sm text-gray-600 hover:text-gray-800 underline"
                              >
                                予定を追加する
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {currentView === 'chat' && selectedTrip && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">チャット - {selectedTrip.name}</h2>
              <button
                onClick={() => {
                  setCurrentView('schedule');
                  // チャットを離れる時に未読カウントをリセット
                  updateUnreadCount(selectedTrip.id, 0);
                }}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
              >
                スケジュールに戻る
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 h-96 flex flex-col">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {selectedTrip.chat && selectedTrip.chat.length > 0 ? (
                  selectedTrip.chat.map(message => (
                    <ChatMessage key={message.id} message={message} />
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>まだメッセージがありません。最初のメッセージを送信してみましょう。</p>
                  </div>
                )}
              </div>
              
              {/* 添付ファイルプレビュー */}
              {chatAttachment && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {chatAttachment.type === 'image' ? (
                        <>
                          <Image size={16} className="text-gray-600" />
                          <span className="text-sm text-gray-700">{chatAttachment.file.name}</span>
                        </>
                      ) : chatAttachment.type === 'url' ? (
                        <>
                          <Link size={16} className="text-gray-600" />
                          <span className="text-sm text-gray-700">{chatAttachment.title || chatAttachment.url}</span>
                        </>
                      ) : null}
                    </div>
                    <button
                      onClick={() => setChatAttachment(null)}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
              
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <div className="relative attachment-menu">
                    <button
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className="bg-gray-100 text-gray-600 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <Paperclip size={16} />
                    </button>
                    
                    {/* 添付メニュー */}
                    {showAttachmentMenu && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                        <div className="p-2 space-y-1">
                          <button
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                const file = e.target.files[0];
                                if (file && isImageFile(file)) {
                                  setChatAttachment({ type: 'image', file });
                                  setShowAttachmentMenu(false);
                                }
                              };
                              input.click();
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                          >
                            <Image size={16} />
                            写真を添付
                          </button>
                          
                          <button
                            onClick={() => {
                              const url = prompt('URLを入力してください:');
                              if (url && isValidUrl(url)) {
                                const title = prompt('タイトルを入力してください (省略可):') || url;
                                setChatAttachment({ type: 'url', url, title });
                                setShowAttachmentMenu(false);
                              } else if (url) {
                                alert('有効なURLを入力してください');
                              }
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2"
                          >
                            <Link size={16} />
                            URLを添付
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="メッセージを入力..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatMessage.trim() && !chatAttachment}
                    className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* モーダル */}
      {!isSharedView && editingTrip && (
        <TripForm
          trip={editingTrip.id ? editingTrip : null}
          onSave={(data) => {
            if (editingTrip.id) {
              updateTrip(editingTrip.id, data);
            } else {
              createTrip(data);
            }
            setEditingTrip(null);
          }}
          onCancel={() => setEditingTrip(null)}
        />
      )}

      {!isSharedView && showScheduleForm && (
        <ScheduleForm
          onSave={(data) => {
            addSchedule(data);
            setShowScheduleForm(false);
          }}
          onCancel={() => setShowScheduleForm(false)}
        />
      )}

      {!isSharedView && editingSchedule && (
        <ScheduleForm
          schedule={editingSchedule}
          onSave={(data) => {
            updateSchedule(editingSchedule.id, data);
            setEditingSchedule(null);
          }}
          onCancel={() => setEditingSchedule(null)}
        />
      )}

      {!isSharedView && showDeleteConfirm && (
        <DeleteConfirmDialog
          onConfirm={() => {
            if (typeof showDeleteConfirm === 'string' && showDeleteConfirm.startsWith('schedule-')) {
              const scheduleId = parseInt(showDeleteConfirm.replace('schedule-', ''));
              deleteSchedule(scheduleId);
            } else {
              deleteTrip(showDeleteConfirm);
            }
            setShowDeleteConfirm(null);
          }}
          onCancel={() => setShowDeleteConfirm(null)}
          message={
            typeof showDeleteConfirm === 'string' && showDeleteConfirm.startsWith('schedule-')
              ? 'このスケジュールを削除してもよろしいですか？'
              : 'この旅行を削除してもよろしいですか？関連するスケジュールやチャットも全て削除されます。'
          }
        />
      )}

      {shareUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">共有URL</h3>
            <p className="text-sm text-gray-600 mb-4">
              以下のURLを共有して、他の人がこの旅行を閲覧できるようにします。
            </p>
            <div className="bg-gray-100 p-3 rounded-md mb-4">
              <p className="text-sm text-gray-800 break-all">{shareUrl}</p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              ※ URLを知っている人だけがアクセスできます
            </p>
            <button
              onClick={() => setShareUrl('')}
              className="w-full bg-gray-800 text-white py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelPlannerApp;
