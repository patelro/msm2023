const TelegramBot = require('node-telegram-bot-api');
const { google } = require('googleapis');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Telegram bot token
const botToken = '<BOT-TOKEN>';

// Create a new instance of TelegramBot
const bot = new TelegramBot(botToken, { polling: true });

//generate unique id
const submissionId = generateSubmissionId();

// Store user responses
let userResponses = {};

// Handle "/start" command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Jai Swaminarayan and welcome to MSM 2023 in Toronto, Canada! This virtual sevak has been created to help Santos submit their transportation details.\n\nEnter /submit to begin. You can enter /goback to edit previous question.');
});

// Handle the /help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'If you have any questions or need assistance, please contact Rohanbhai Patel at 647-767-9421.');
});

// Handle "/submit" command
bot.onText(/\/submit/, (msg) => {
    const chatId = msg.chat.id;

    userResponses[submissionId] = {};
    bot.sendMessage(chatId, 'Please select the transportation type:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Airport Pick-Up', callback_data: 'airport_pick_up' }],
                [{ text: 'Airport Drop-Off', callback_data: 'airport_drop_off' }]
            ]
        }
    });
});


bot.onText(/\/goback/, (msg) => {
    const chatId = msg.chat.id;
    const responses = userResponses[chatId];
    const keys = Object.keys(responses);
    const lastQuestion = keys[keys.length - 1];

    if (lastQuestion) {
        delete responses[lastQuestion];
        if (lastQuestion == 'name') {
            bot.sendMessage(chatId, 'Please enter updated name:');
        } else if (lastQuestion == 'numTravelers') {
            bot.sendMessage(chatId, 'Please enter updated number of Santos:');
        } else if (lastQuestion == 'transportationType') {
            bot.sendMessage(chatId, 'Please select a new transportation type:', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Airport Pick-Up', callback_data: 'airport_pick_up' }],
                        [{ text: 'Airport Drop-Off', callback_data: 'airport_drop_off' }]
                    ]
                }
            });
        } else if (lastQuestion == 'phone') {
            bot.sendMessage(chatId, 'Please enter updated phone number:');
        } else if (lastQuestion == 'flightNumber') {
            bot.sendMessage(chatId, 'Please enter updated flight number:');
        } else if (lastQuestion == 'date') {
            bot.sendMessage(chatId, 'Please enter updated date (yyyy/mm/dd):');
        } else if (lastQuestion == 'time') {
            bot.sendMessage(chatId, 'Please enter updated time (hh:mm AM/PM):');
        } else if (lastQuestion == 'numCarryOns') {
            bot.sendMessage(chatId, 'Please enter updated number of carry-on bags:');
        } else if (lastQuestion == 'numCheckIn') {
            bot.sendMessage(chatId, 'Please enter updated number of check-in bags:');
        } else if (lastQuestion == 'numHaribhakts') {
            bot.sendMessage(chatId, 'Please enter updated number of Haribhakts:');
        } else {
            bot.sendMessage(chatId, 'Question not found. Please enter /start.');
        }
    } else {
        bot.sendMessage(chatId, "You have reached the beginning. There are no previous questions.");
    }
});



// Handle transportation type selection
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const transportationType = callbackQuery.data;

    userResponses[chatId] = { transportationType };

    if (transportationType == 'airport_pick_up') {
        bot.sendMessage(chatId, 'Please provide the following details to submit your Airport Pick-Up request:');
        bot.sendMessage(chatId, 'Name:');
    } else {
        bot.sendMessage(chatId, 'Please provide the following details to submit your Airport Drop-Off request:');
        bot.sendMessage(chatId, 'Name:');
    }

});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (messageText === '/start' || messageText === '/submit' || messageText === '/edit' || messageText === '/goback') {
        return; // Ignore these commands in the main message handling logic
    }

    if (messageText === '/help') {
        bot.sendMessage(chatId, 'If you have any questions or need assistance, please contact Rohanbhai Patel at 647-767-9421.');
    }

    if (messageText === '/goback') {
        // Handle the /goback command
        const previousQuestion = getPreviousQuestion(responses);
        if (previousQuestion) {
            delete responses[previousQuestion];
            bot.sendMessage(chatId, `EDIT: ${previousQuestion}`);
        } else {
            bot.sendMessage(chatId, 'There is no previous question to go back to.');
        }
        return;
    }


    const responses = userResponses[chatId];

    if (!responses.name) {
        responses.name = messageText;
        bot.sendMessage(chatId, 'Please provide your phone number:');
    } else if (!responses.phone) {
        if (!isValidPhoneNumber(messageText)) {
            bot.sendMessage(chatId, 'Invalid phone number. Please try again:');
            return;
        }
        responses.phone = messageText;
        bot.sendMessage(chatId, 'Please provide the number of Santos travelling:');
    } else if (!responses.numTravelers) {
        responses.numTravelers = messageText;
        if (responses.transportationType === 'airport_pick_up' || responses.transportationType === 'airport_drop_off') {
            bot.sendMessage(chatId, 'Please provide the number of accompanying Haribhakts:');
        } else {
            bot.sendMessage(chatId, 'Please provide the number of carry-ons:');
        }
    } else if (!responses.numHaribhakts && (responses.transportationType === 'airport_pick_up' || responses.transportationType === 'airport_drop_off')) {
        responses.numHaribhakts = messageText;
        bot.sendMessage(chatId, 'Please provide the flight number:');
    } else if (!responses.flightNumber && (responses.transportationType === 'airport_pick_up' || responses.transportationType === 'airport_drop_off')) {
        responses.flightNumber = messageText;
        bot.sendMessage(chatId, 'Please provide the date (yyyy/mm/dd):');
    } else if (!responses.date) {
        if (!isValidDate(messageText)) {
            bot.sendMessage(chatId, 'Invalid date. Please try again (yyyy/mm/dd):');
            return;
        }
        responses.date = messageText;
        bot.sendMessage(chatId, 'Please provide the time (hh:mm AM/PM):');
    } else if (!responses.time) {
        if (!isValidTime(messageText)) {
            bot.sendMessage(chatId, 'Invalid time. Please try again (hh:mm AM/PM):');
            return;
        }
        responses.time = messageText;

        if (responses.transportationType === 'airport_pick_up' || responses.transportationType === 'airport_drop_off') {
            bot.sendMessage(chatId, 'Please provide the number of carry-on bags:');
        } else {
            // Save the responses to Google Sheets
            saveResponsesToGoogleSheet(submissionId, responses);

            // Show confirmation message
            const confirmationMessage = `Thank you! Your transportation details have been submitted successfully:\n\n` +
                `Transportation type: ${responses.transportationType}\n` +
                `Name: ${responses.name}\n` +
                `Phone: ${responses.phone}\n` +
                `Number of Santos travelling: ${responses.numTravelers}\n` +
                `Number of accompanying Haribhakts: ${responses.numHaribhakts}\n` +
                `Flight Number: ${responses.flightNumber}\n` +
                `Date: ${responses.date}\n` +
                `Time: ${responses.time}\n` +
                `Number of Carry-on bags: ${responses.numCarryOns}\n` +
                `Number of Check-in bags: ${responses.numCheckIn}\n\n` +
                `If you have any questions or would like to make any changes please reach out to Rohanbhai Patel at 647-767-9421.\nTo submit another response enter, /start or /submit.`;

            bot.sendMessage(chatId, confirmationMessage);

            // Clear the user responses
            // userResponses[chatId] = {};
            delete userResponses[chatId];

            //bot.sendMessage(chatId, 'Thank you! Your transportation details have been submitted successfully. If you have any questions or would like to make any changes please reach out to Rohanbhai Patel at 647-767-9421.\n\nTo submit another response enter /start or /submit.');
        }
    } else if (!responses.numCarryOns && (responses.transportationType === 'airport_pick_up' || responses.transportationType === 'airport_drop_off')) {
        responses.numCarryOns = messageText;
        bot.sendMessage(chatId, 'Please provide the number of check-in bags:');
    } else if (!responses.numCheckIn && (responses.transportationType === 'airport_pick_up' || responses.transportationType === 'airport_drop_off')) {
        responses.numCheckIn = messageText;

        // Save the responses to Google Sheets
        saveResponsesToGoogleSheet(submissionId, responses);

        // Show confirmation message
        const confirmationMessage = `Thank you! Your transportation details have been submitted successfully:\n\n` +
            `Transportation type: ${responses.transportationType}\n` +
            `Name: ${responses.name}\n` +
            `Phone: ${responses.phone}\n` +
            `Number of Santos travelling: ${responses.numTravelers}\n` +
            `Number of accompanying Haribhakts: ${responses.numHaribhakts}\n` +
            `Flight Number: ${responses.flightNumber}\n` +
            `Date: ${responses.date}\n` +
            `Time: ${responses.time}\n` +
            `Number of Carry-on bags: ${responses.numCarryOns}\n` +
            `Number of Check-in bags: ${responses.numCheckIn}\n\n` +
            `If you have any questions or would like to make any changes please reach out to Rohanbhai Patel at 647-767-9421.\nTo submit another response, enter /start or /submit.`;

        bot.sendMessage(chatId, confirmationMessage);

        // Clear the user responses
        // userResponses[chatId] = {};
        delete userResponses[chatId];

        //bot.sendMessage(chatId, 'Thank you! Your transportation details have been submitted successfully. If you have any questions or would like to make any changes please reach out to Rohanbhai Patel at 647-767-9421.\n\nTo submit another response enter /start or /submit.');
    }
});



function getPreviousQuestion(responses) {
    // Assuming your responses object has a defined sequence or order of questions
    const questions = ['Name', 'Phone Number:', 'Number of Santos:', 'Number of Haribhakts:', 'Flight Number:', 'Date', 'Time', 'Number of Carry-on bags:', 'Number of Check-in bags:'];

    // Find the last answered question
    const lastAnsweredQuestion = questions.find((question) => responses[question]);

    // Find the index of the last answered question
    const lastAnsweredIndex = questions.indexOf(lastAnsweredQuestion);

    // If the last answered index is greater than 0, return the previous question
    if (lastAnsweredIndex > 0) {
        return questions[lastAnsweredIndex - 1];
    }

    // If there is no previous question, return null or an appropriate value
    return null;
}


function generateSubmissionId() {
    const uuid = uuidv4().replace(/-/g, ''); // Generate a UUID and remove hyphens
    const submissionId = parseInt(uuid.slice(0, 5), 16); // Convert the first 5 characters to a decimal number
    return submissionId;
}


// Load the credentials from the JSON key file
const credentials = require('./credentials.json');

// Specify the Google Sheets API version
const version = 'v4';

// Create a new JWT client
const client = new google.auth.JWT(
    credentials.client_email,
    null,
    credentials.private_key,
    ['https://www.googleapis.com/auth/spreadsheets']
);

// Authorize the client
client.authorize((err, tokens) => {
    if (err) {
        console.error('Authorization error:', err);
        return;
    }

    console.log('Authorization successful');
});

// Save the user responses to Google Sheets
function saveResponsesToGoogleSheet(submissionId, responses) {
    // Create a new Google Sheets instance
    const sheets = google.sheets({ version, auth: client });

    // Read the spreadsheet ID from the credentials
    const spreadsheetId = '17HLZcGuFyWvanyIwAWQ5f0DkkaAfGV0KEijP6TCuXjw';

    // Define the range where the data will be written
    const range = 'test!A2:K';

    // Prepare the values to be written to the sheet
    const values = [
        [
            submissionId,
            responses.name,
            responses.phone,
            responses.transportationType,
            responses.numTravelers,
            responses.flightNumber || '',
            formatDate(responses.date),
            formatTime(responses.time),
            responses.numCarryOns || '',
            responses.numCheckIn || '',
            responses.numHaribhakts || ''
        ]
    ];

    // Define the request parameters
    const request = {
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        resource: { values }
    };

    // Write the data to the sheet
    sheets.spreadsheets.values.append(request, (err, response) => {
        if (err) {
            console.error('The API returned an error:', err);
            return;
        }

        console.log('Data updated successfully');
    });
}

// Validate the date format
function isValidDate(dateString) {
    const regex = /^\d{4}\/\d{2}\/\d{2}$/;
    return regex.test(dateString);
}

// Validate the time format
function isValidTime(timeString) {
    const regex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    return regex.test(timeString);
}

// Validate the phone number format
function isValidPhoneNumber(phoneNumber) {
    const regex = /^\d{10}$/;
    return regex.test(phoneNumber);
}

// Format the date (yyyy/mm/dd)
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

// Format the time (hh:mm AM/PM)
function formatTime(timeString) {
    const time = new Date(`2000/01/01 ${timeString}`);
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}
