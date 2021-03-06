const bcrypt = require('bcryptjs');
const e = require('express');
const { User } = require('../models');
const saltRounds = 10; // TODO: Update later to some higher value

userObject = (user) => {
  return {
    _id: user._id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    active: user.active,
    gender: user.gender,
    phone: user.phone,
    role_id: user.role_id,
  };
};

let exportedMethods = {
  async allUsers() {
    let users = await User.find().sort({ firstname: 'asc' });
    return users;
  },

  async getById(id) {
    if (!id) throw 'You must provide an id';
    if (typeof id != 'string' || id.trim().length === 0)
      throw 'You must provide a valid id';

    const user = await User.findById(id);

    if (!user) throw 'Invalid email or password!';
    return user;
  },

  async getUserByEmail(email) {
    if (!email) throw 'You must provide a email';
    if (typeof email != 'string' || email.trim().length === 0)
      throw 'You must provide a valid email';

    const user = await User.findOne({ email: email });

    if (!user) throw 'Invalid email or password!';

    return user;
  },

  async create(userInfo) {
    this.validateUserInfo(userInfo);
    const hash = await bcrypt.hash(userInfo.password, saltRounds);

    let user = await User.create({
      firstname: userInfo.firstname,
      lastname: userInfo.lastname,
      email: userInfo.email,
      hashedPassword: hash,
      gender: userInfo.gender,
      role_id: userInfo.role_id,
    });

    if (!user) throw 'Trouble signing you up';
    return userObject(user);
  },

  //update user
  async update(id, updateData) {
    //find the specified user and all his/her information
    try {
      const oldUser = await this.getById(id);
      if (!oldUser) throw 'User does not Exist';

      this.validateUpdateInfo(updateData);

      if (updateData.password2 && updateData.password)
        updateData.hashedPassword = await bcrypt.hash(
          updateData.password,
          saltRounds
        );

      let updateInfo = await User.findOneAndUpdate(
        { _id: id },
        { $set: updateData },
        { runValidators: true }
      );

      if (updateInfo.errors)
        throw `Error ecountered while updating the specified user: ${updateInfo.errors}`;
      return await this.getById(id);
    } catch (e) {
      throw e;
    }
  },

  validateUserInfo(user) {
    if (!user) throw 'Provide user details';
    if (!user.firstname) throw 'Provide firstname';
    if (!user.lastname) throw 'Provide lastname';
    if (!user.email) throw 'Provide email';

    if (!user.password) throw 'Provide password';

    this.validateUpdateInfo(user);
  },

  checkName(input) {
    if (typeof input !== 'string') throw 'Invalid Name';
    if (input.trim().length < 2 || input.trim().length > 30)
      throw 'Name should be between 2 and 30 characters';

    let special = " '`!";
    let alphabet = `qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM${special}`;

    //check if name only has letters
    for (let i = 0; i < input.length; i++)
      if (alphabet.indexOf(input[i]) === -1)
        throw 'Invalid Character added in name';
  },

  checkEmail(input) {
    if (typeof input !== 'string') throw `E-Mail Address has to be a string.`;

    const emailformat = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if (!emailformat.test(input.toLowerCase()))
      throw `${input} is not a valid E-Mail Address.`;
  },

  checkPassword(input) {
    const passwordFormat = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,16}$/;

    if (input.length >= 6 && input.length <= 16) {
      if (!passwordFormat.test(input))
        throw `Password needs to be a valid string of 6 - 16 characters with at least one uppercase letter, one lowercase letter, one number and one special character`;
    } else
      throw `Invalid length of password, password needs to be a minimum of 6 characters and a maximum of 16 characters`;
  },

  validateUpdateInfo(user) {
    if (user.firstname) this.checkName(user.firstname);
    if (user.lastname) this.checkName(user.lastname);
    if (user.email) this.checkEmail(user.email);
    if (user.password) this.checkPassword(user.password);

    if (user.password && user.password2) {
      if (user.password !== user.password2) throw 'Password does not match';

      try {
        this.checkPassword(user.password);
      } catch (e) {
        throw e;
      }
    }
  },

  async isAuthorizedUser(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user.active)
      throw 'Your account has been disabled by the administrator. Please contact admin to unlock your account.';
    let match = await bcrypt.compare(password, user.hashedPassword);
    if (!match) throw 'Provide a valid username and/or password.';
    return userObject(user);
  },
};

module.exports = exportedMethods;
