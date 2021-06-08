# Secure Passwords App

## Quick Access

### https://tariksecurepassword.netlify.app/

## Introduction

This is MERN app. MERN stands for MongoDB, Express, React, Node.

In order to use the app, first user needs to register to the system. While registering, user needs to provide name, surname, email and password.

### Register

In register, user's password will be saved to mongodb. Not as a plain text, but as using aes-256-ctr algorithm and crypto module of nodejs. User's plain password will be encrypted
using ``crypto.createCipheriv`` function. In the code below 16 bytes encryption used with aes-256-ctr.

```

const crypto = require("crypto");
const config = require("config");
const secret = process.env.CRYPTO_SECRET || config.get("secret.crypto");
const algorithm = "aes-256-ctr";
const iv = crypto.randomBytes(16);

const encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, secret, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return {
    iv: iv.toString("hex"),
    password: encrypted.toString("hex"),
  };
};
```

An example of registered user in mongodb document is showned below. As it can be realized, encryption function return values which are iv (initialization vector) and password are saved in mongoose document as well as user's other fields.

![image](https://user-images.githubusercontent.com/61876765/120395673-0db0a080-c33e-11eb-9501-d4e57c5f6383.png)

```

router.post(
  "/register",
  [
    check("name", "Name is required").not().isEmpty(),
    check("surname", "Surname is required").not().isEmpty(),
    check("email", "Please provide valid e-mail").isEmail(),
    check("password", "Password is required").not().isEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { name, surname, email, password } = req.body;
      // Check if user already exists with the given emai
      let user = await User.findOne({ email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "User Already Exists With That E-Mail" }] });
      }
      const hashedData = encrypt(password);
      user = new User({
        name,
        surname,
        email,
        password: hashedData.password,
        iv: hashedData.iv,
      });
      await user.save();
      return res.status(200).send();
    } catch (err) {
      return res.status(500).send();
    }
  }
);

```

The code section below corresponds to user register endpoint in our express api. I used express-validator in order to check all fields are valid and not empty.
If any of them fails we send 400 bad request in order to block registering. 

```   
const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      } 
      
```

If the user provides all fields and passes this phase, then I check if there is alredy exists user with the email that user provded. Nothing special here. Just like in most of the apps. Afterwards we use encrypt custom function to save user's password and password's iv.


### Login

User has now registered, then is able to login to the system. Similiar structure here again. Checking req.body fields with express-validator. And the rest of them is standart login logics. 

### Brute Force Attacks

What is Brute Force Attacks?

Lets take a look at what does wikipedia says about brute force attacks.

> <em>In cryptography, a brute-force attack consists of an attacker submitting many passwords or passphrases with the hope of eventually guessing a combination correctly. The attacker systematically checks all possible passwords and passphrases until the correct one is found. Alternatively, the attacker can attempt to guess the key which is typically created from the password using a key derivation function. This is known as an exhaustive key search.</em>

One thing should be mentioned in login is that, I used express-brute package to prevent unlimited requests. This package provides a brute-force protection middleware for express routes that rate-limits incoming requests, increasing the delay with each request in a fibonacci-like sequence. 

I set some configuration in the login using express-brute. 20000 ms for minWait and 6 for freeRetries. But what are they ?

<strong>minWait</strong>: The initial wait time (in milliseconds) after the user runs out of retries

<strong>freeRetries</strong>:  The number of retires the user has before they need to start waiting

```

// Handling brute force response

export const handleManyRequest = (err) => {
  if (err?.data?.error?.text === "Too many requests in this time frame.") {
    return toast.error(
      "TOO MANY REQUESTS RECEIVED. PLEASE WAIT SOME TIME THEN TRY AGAIN",
      {
        position: "top-center",
      },
    );
  }
};



// Login User with redux action

export const login = (data, history) => async (dispatch) => {
  try {
    const { email, password } = data;
    const res = await Axios.post(`${serverURL}/api/user/login`, {
      email,
      password,
    });
    dispatch({
      type: LOGIN_SUCCESS,
      payload: res.data,
    });
    dispatch(loadUser());
    history.push("/identity");
    return res;
  } catch (err) {
    handleManyRequest(err.response);
    const errors = err.response?.data?.errors;
    if (errors) {
      errors.forEach((error) =>
        toast.error(error.msg, { position: "top-center", toastId: "login" }),
      );
    }
    dispatch({
      type: LOGIN_FAIL,
    });
  }
};


```


Below is a live example in the app. I tried to login with wrong credentials couple of times. 
Afterwards I get this response.

![image](https://user-images.githubusercontent.com/61876765/121262387-b4f08300-c8bc-11eb-8612-2968d9bad9a8.png)

![image](https://user-images.githubusercontent.com/61876765/121262401-bfab1800-c8bc-11eb-8409-57850720940c.png)


![image](https://user-images.githubusercontent.com/61876765/121261960-182de580-c8bc-11eb-8c2b-34f5fbc66f87.png)


## Usage of Compare and Decryption Custom Functions In Login


```
const ExpressBrute = require("express-brute");
const store = new ExpressBrute.MemoryStore();
const bruteforce = new ExpressBrute(store, {
  minWait: 20000, // 20 seconds
  freeRetries: 6,
});
const { compare } = require("../custom-services/Encryption");


router.post(
  "/login",
  bruteforce.prevent,
  [
    check("email", "Email is required").not().isEmpty(),
    check("email", "Please provide valid e-mail").isEmail(),
    check("password", "Password is required").not().isEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { email, password } = req.body;
      // Check if the user exists in db
      let user = await User.findOne({ email });
      // User not found with the given email
      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid Credentials" }] });
      }
      // Check if the password is true
      const isMatch = compare(password, {
        iv: user.iv,
        password: user.password,
      });
      // User not found with the given password
      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: "Invalid Credentials" }] });
      }
      const payload = {
        user: {
          id: user.id,
          name: user.name,
          surname: user.surname,
          email: user.email,
        },
      };
      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET || config.get("jwtSecret"),
        {
          expiresIn: 480000,
        }
      );
      await user.save();
      res.status(200).json({ token });
    } catch (err) {
      return res.status(500).send();
    }
  }
);

```

On the other hand, I used my custom compare and decrypt function in the login. What happens here is that, we check the credentials in the login, and if credentials are provdied properly, then we get the user from mongodb. And as I mentioned above, there are iv and password fields in the user document. I get these two fields and put into compare function second parameter. Remember, the first parameter of compare function was plain password text that the user provided in login. You can also check the steps above.
Next step is, we are using decrypt function in compare in order to get plain password of hash data. To achieve that, I provide our algorithm and secret that I defined in the imports section. Algorithm and secret should be the same, otherwise we can not get proper results anyway.

```

const crypto = require("crypto");
const config = require("config");
const secret = process.env.CRYPTO_SECRET || config.get("secret.crypto");
const algorithm = "aes-256-ctr";
const iv = crypto.randomBytes(16);

// Using secret and passing encryption idx in order to decrpyt given password
const decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    secret,
    Buffer.from(hash.iv, "hex")
  );
  const decrpyted = Buffer.concat([
    decipher.update(Buffer.from(hash.password, "hex")),
    decipher.final(),
  ]);
  return decrpyted.toString();
};

const compare = (password, hash) => {
  const plainPassword = decrypt(hash);
  if (password === plainPassword) {
    return true;
  }
  return false;
};


```







