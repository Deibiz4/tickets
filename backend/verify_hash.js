const bcrypt = require('bcryptjs');

const hash = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
const password = 'admin123';

bcrypt.compare(password, hash).then(isMatch => {
    console.log(`Password 'admin123' matches hash: ${isMatch}`);
}).catch(err => {
    console.error('Error comparing hash:', err);
});
