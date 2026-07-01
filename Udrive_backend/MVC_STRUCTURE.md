# UDrive Backend - MVC স্ট্রাকচার 🏗️

## সংক্ষিপ্ত বিবরণ
আপনার ব্যাকএন্ড একটি **Monolithic** (সব কিছু এক জায়গায়) স্ট্রাকচার থেকে একটি সুসংগঠিত **MVC (Model-View-Controller)** আর্কিটেকচারে রূপান্তরিত হয়েছে। এটি আপনার কোড কে আরও সংগঠিত, রক্ষণাবেক্ষণযোগ্য এবং স্কেলযোগ্য করে তোলে।

## ডিরেক্টরি স্ট্রাকচার

```
Udrive_backend/
├── index.js                 # মূল এন্ট্রি পয়েন্ট
├── package.json            # প্রজেক্ট ডিপেন্ডেন্সি
├── .env                    # পরিবেশ ভেরিয়েবল
│
├── config/                 # কনফিগারেশন ফাইল
│   └── supabaseConfig.js   # সুপাবেস ইনিশিয়েলাইজেশন
│
├── models/                 # ডাটাবেস অপারেশন
│   └── bookingModel.js     # বুকিং সম্পর্কিত ডাটাবেস কাজ
│
├── controllers/            # ব্যবসায়িক লজিক
│   └── paymentController.js # পেমেন্ট হ্যান্ডলিং লজিক
│
├── routes/                 # এপিআই এন্ডপয়েন্ট
│   └── paymentRoutes.js    # পেমেন্ট রুট
│
└── utils/                  # সহায়ক ফাংশন
    └── helpers.js          # ইউটিলিটি ফাংশন
```

## আর্কিটেকচার ব্যাখ্যা

### 1. **Models** (`models/`)
- সকল ডাটাবেস অপারেশন পরিচালনা করে
- ফাংশন গুলো: `getBookingById()`, `updateBookingStatus()`, `createBooking()`
- ডাটাবেস লজিক কে ব্যবসায়িক লজিক থেকে আলাদা রাখে
- **ফাইল**: `bookingModel.js`

### 2. **Controllers** (`controllers/`)
- ব্যবসায়িক লজিক এবং অনুরোধ হ্যান্ডলিং করে
- Model ফাংশন কলার করে ডাটাবেসের সাথে যোগাযোগ করে
- যাচাইকরণ এবং এরর হ্যান্ডলিং পরিচালনা করে
- **ফাইল**: `paymentController.js`
  - `initializePayment()` - পেমেন্ট গেটওয়ে শুরু করা
  - `paymentSuccess()` - সফল পেমেন্ট হ্যান্ডেল করা
  - `paymentFail()` - ব্যর্থ পেমেন্ট হ্যান্ডেল করা
  - `paymentCancel()` - বাতিল করা পেমেন্ট হ্যান্ডেল করা
  - `paymentIPN()` - IPN নোটিফিকেশন হ্যান্ডেল করা

### 3. **Routes** (`routes/`)
- সকল এপিআই এন্ডপয়েন্ট ডিফাইন করে
- HTTP অনুরোধ কে কন্ট্রোলার ম্যাথড ম্যাপ করে
- **ফাইল**: `paymentRoutes.js`
  - `POST /api/payment/init` - পেমেন্ট শুরু করা
  - `POST /api/payment/success` - সফল কলব্যাক
  - `POST /api/payment/fail` - ব্যর্থতা কলব্যাক
  - `POST /api/payment/cancel` - বাতিলকরণ কলব্যাক
  - `POST /api/payment/ipn` - IPN কলব্যাক

### 4. **Config** (`config/`)
- কনফিগারেশন এবং বাহ্যিক সেবা ইনিশিয়েলাইজ করে
- **ফাইল**: `supabaseConfig.js` - সুপাবেস ক্লায়েন্ট ইনিশিয়েলাইজ করে

### 5. **Utils** (`utils/`)
- অ্যাপ্লিকেশন জুড়ে ব্যবহৃত সহায়ক ফাংশন
- **ফাইল**: `helpers.js`
  - `generateTransactionId()` - অনন্য ট্রানজ্যাকশন আইডি তৈরি করা
  - `isValidEmail()` - ইমেইল যাচাইকরণ
  - `validateRequiredFields()` - ফিল্ড যাচাইকরণ

## কীভাবে কাজ করে

### অনুরোধ প্রবাহ:
```
অনুরোধ → রুট (paymentRoutes.js) 
      ↓
কন্ট্রোলার (paymentController.js) 
      ↓
মডেল (bookingModel.js) 
      ↓
ডাটাবেস (সুপাবেস) 
      ↓
প্রতিক্রিয়া
```

### উদাহরণ: পেমেন্ট সফল কলব্যাক
1. **রুট** `/api/payment/success` এ POST অনুরোধ পায়
2. **কন্ট্রোলার** (`paymentSuccess()`) বুকিং আইডি এবং ট্রানজ্যাকশন আইডি বের করে
3. **মডেল** (`updateBookingStatus()`) সুপাবেস এ বুকিং আপডেট করে
4. **প্রতিক্রিয়া** যথাযথ স্ট্যাটাস সহ পাঠানো হয়

## এপিআই এন্ডপয়েন্ট

| পদ্ধতি | এন্ডপয়েন্ট | বর্ণনা |
|--------|----------|-------------|
| POST | `/api/payment/init` | পেমেন্ট গেটওয়ে শুরু করা |
| POST | `/api/payment/success` | সফল পেমেন্ট হ্যান্ডেল করা |
| POST | `/api/payment/fail` | ব্যর্থ পেমেন্ট হ্যান্ডেল করা |
| POST | `/api/payment/cancel` | বাতিল করা পেমেন্ট হ্যান্ডেল করা |
| POST | `/api/payment/ipn` | IPN নোটিফিকেশন হ্যান্ডেল করা |
| GET | `/api/health` | সার্ভার স্ট্যাটাস চেক করা |

## ফ্রন্টএন্ড ইন্টিগ্রেশন

আপনার ফ্রন্টএন্ডে পুরানো এন্ডপয়েন্ট গুলো আপডেট করুন:

**পুরানো:**
```javascript
fetch('/api/init', { method: 'POST', body: JSON.stringify(data) })
fetch('/api/success', { method: 'POST', body: JSON.stringify(data) })
```

**নতুন:**
```javascript
fetch('/api/payment/init', { method: 'POST', body: JSON.stringify(data) })
fetch('/api/payment/success', { method: 'POST', body: JSON.stringify(data) })
```

## নতুন বৈশিষ্ট্য যোগ করা

### নতুন কন্ট্রোলার যোগ করতে:
1. `controllers/নতুনবৈশিষ্ট্যController.js` তৈরি করুন
2. `routes/নতুনবৈশিষ্ট্যRoutes.js` তৈরি করুন
3. রুট গুলো `index.js` এ ইমপোর্ট করুন

### ডাটাবেস অপারেশন যোগ করতে:
1. `models/bookingModel.js` এ নতুন ফাংশন যোগ করুন
2. উপযুক্ত কন্ট্রোলার থেকে কল করুন

### ইউটিলিটি যোগ করতে:
1. `utils/helpers.js` এ ফাংশন যোগ করুন

## প্রয়োজনীয় পরিবেশ ভেরিয়েবল

আপনার `.env` ফাইলে এগুলো থাকা উচিত:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
STORE_ID=your_sslcommerz_store_id
STORE_PASSWORD=your_sslcommerz_password
ROOT_URL=http://127.0.0.1:5000
PORT=5000
```

## MVC স্ট্রাকচার এর সুবিধা

✅ **ভালো সংগঠন** - দায়িত্ব বিভাজন  
✅ **রক্ষণাবেক্ষণ সহজ** - কোড খুঁজে পাওয়া সহজ  
✅ **স্কেলেবিলিটি** - নতুন বৈশিষ্ট্য যোগ করা সহজ  
✅ **পরীক্ষাযোগ্যতা** - মডেল এবং কন্ট্রোলার আলাদাভাবে পরীক্ষা করা যায়  
✅ **পুনরায় ব্যবহারযোগ্যতা** - মডেল বিভিন্ন কন্ট্রোলার ব্যবহার করতে পারে  
✅ **এরর হ্যান্ডলিং** - কেন্দ্রীভূত এরর ম্যানেজমেন্ট  

## সার্ভার চালানো

```bash
npm start
# অথবা
node index.js
```

সার্ভার ডিফল্টরূপে `http://localhost:5000` এ চলবে।
