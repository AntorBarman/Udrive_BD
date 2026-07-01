const supabase = require('../config/supabaseConfig');

// ======================== বুকিং মডেল ========================
// ডাটাবেস সম্পর্কিত সকল কাজ এখানে করা হয়

// ১. বুকিং আইডি দিয়ে বুকিং খুঁজে বের করা
// booking_id অথবা id দিয়ে খোঁজার জন্য
const getBookingById = async (bookingId) => {
    try {
        // প্রথমে booking_id দিয়ে try
        let { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('booking_id', bookingId.trim())
            .single();

        // না পেলে id দিয়ে try
        if (error || !data) {
            const result = await supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId.trim())
                .single();
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.error('Booking not found:', error.message);
            return null;
        }
        return data;
    } catch (err) {
        console.error('Database error:', err);
        return null;
    }
};

// २. বুকিং স্ট্যাটাস আপডেট করা এবং ট্রানজ্যাকশন আইডি সংরক্ষণ করা
const updateBookingStatus = async (bookingId, status, transactionId) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .update({
                status: status,
                transaction_id: String(transactionId)
            })
            .eq('booking_id', bookingId.trim())
            .select();

        if (error) {
            console.error('বুকিং আপডেট এরর:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true, data: data };
    } catch (err) {
        console.error('ডাটাবেস এরর:', err);
        return { success: false, error: err.message };
    }
};

// ३. নতুন বুকিং তৈরি করা
const createBooking = async (bookingData) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .insert([bookingData])
            .select();

        if (error) {
            console.error('বুকিং তৈরি এরর:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true, data: data };
    } catch (err) {
        console.error('ডাটাবেস এরর:', err);
        return { success: false, error: err.message };
    }
};

module.exports = {
    getBookingById,
    updateBookingStatus,
    createBooking
};
