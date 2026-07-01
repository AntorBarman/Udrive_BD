// ======================== সহায়ক ফাংশন ========================
// বিভিন্ন ইউটিলিটি এবং ভেরিফিকেশন ফাংশন

// ১. অনন্য ট্রানজ্যাকশন আইডি তৈরি করা
const generateTransactionId = () => {
    return `REF-${Date.now()}`;
};

// २. ইমেইল ফরম্যাট ভেরিফাই করা
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// ३. প্রয়োজনীয় ফিল্ড ভ্যালিডেশন করা
const validateRequiredFields = (data, requiredFields) => {
    for (let field of requiredFields) {
        if (!data[field]) {
            return {
                isValid: false,
                message: `প্রয়োজনীয় ফিল্ড missing: ${field}`
            };
        }
    }
    return { isValid: true };
};

module.exports = {
    generateTransactionId,
    isValidEmail,
    validateRequiredFields
};
