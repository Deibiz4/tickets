const passport = require('passport');
const MicrosoftStrategy = require('passport-microsoft').Strategy;
const User = require('../models/user.model');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: process.env.MICROSOFT_CALLBACK_URL,
    scope: ['user.read'],
    tenant: 'organizations', // Use 'organizations' for work/school accounts
    // Microsoft specific:
    authorizationURL: 'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize',
    tokenURL: 'https://login.microsoftonline.com/organizations/oauth2/v2.0/token',
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

            if (!email) {
                return done(new Error('No email found in Microsoft profile'), null);
            }

            // Restringir acceso solo a usuarios de @jata.es
            if (!email.toLowerCase().endsWith('@jata.es')) {
                return done(new Error('Acceso no autorizado: Solo se permiten cuentas de @jata.es'), null);
            }

            // 1. Check if user exists by email
            let user = await User.findByEmail(email);

            if (user) {
                return done(null, user);
            }

            // 2. If not, create new user
            // Generate a random password since they will login via OAuth
            const randomPassword = uuidv4();

            const newUser = await User.create({
                username: email.split('@')[0], // Use part before @ as username
                email: email,
                password: randomPassword,
                fullName: profile.displayName || 'Microsoft User',
                department: 'General', // Default
                role: 'user'
            });

            return done(null, newUser);
        } catch (err) {
            return done(err, null);
        }
    }
));

module.exports = passport;
