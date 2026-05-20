import User from "../models/user.model.js";
import crypto from "crypto";    //cryto is present in nodejs alt of bycrypt
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import Session from "../models/session.model.js";

async function register(req, res) {
    const { name, email, password } = req.body;

    try {
        const userExists = await User.findOne({
            $or: [
                { email },
                { name }
            ]
        });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashPassword = crypto.createHash("sha256").update(password).digest("hex");


        const user = await User.create({
            name,
            email,
            password: hashPassword
        });
        //after user created token is given to him
        const refreshToken = jwt.sign({ id: user._id }, config.JWT_KEY, //saved in the cookie, helps to create access token via server, usless on its own
            {
                expiresIn: "7d"
            }
        );
        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
        const session = await Session.create({
            user: user._id,
            refreshTokenHash,
            ip: req.ip,
            userAgent: req.headers["user-agent"]

        });


        const accessToken = jwt.sign({
            id: user._id,
            sessionId: session._id


        }, config.JWT_KEY,  //access token is saved in the memory
            {
                expiresIn: "15m"
            }
        );



        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,     //disables the refresh token's access in the browser
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000

        })
        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            token: accessToken     //IMPT: token is send to user with the response
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
}

async function login(req, res) {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const hashPassword = crypto.createHash("sha256").update(password).digest("hex");

        if (user.password !== hashPassword) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const refreshToken = jwt.sign({ id: user._id }, config.JWT_KEY, { expiresIn: "7d" });
        const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

        const session = await Session.create({
            user: user._id,
            refreshTokenHash,
            ip: req.ip || "unknown",
            userAgent: req.headers["user-agent"] || "unknown"
        });

        const accessToken = jwt.sign({
            id: user._id,
            sessionId: session._id
        }, config.JWT_KEY, { expiresIn: "15m" });

        res.cookie("refreshToken", refreshToken, {  //refresh token is saved in the cookie
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({
            message: "Login successful",
            user: { id: user._id, name: user.name, email: user.email },
            token: accessToken     //IMPT: token is send to user with the response
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
}


async function getUser(req, res) {
    try {
        if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Unauthorized: No token provided" });
        }

        const token = req.headers.authorization.split(" ")[1];        //identify the user with the token
        const decodedToken = jwt.verify(token, config.JWT_KEY);
        req.user = decodedToken; //store the decoded token in req.user

        const user = await User.findById(req.user.id).select("-password");
        res.status(200).json(user);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
}

async function refreshToken(req, res) {
    try {
        const currentToken = req.cookies.refreshToken;      //old refresh token is saved in the cookie
        if (!currentToken) {
            return res.status(401).json({ message: "Unauthorized: No refresh token provided" });
        }
        const decoded = jwt.verify(currentToken, config.JWT_KEY);

        const refreshTokenHash = crypto.createHash("sha256").update(currentToken).digest("hex");  //hash is generated for the refresh token(old current token)
        const session = await Session.findOne({ refreshTokenHash, revoked: false });      //find the session of the user that is not closed/logged out  using the refresh token hash 
        if (!session) {
            return res.status(401).json({ message: "Unauthorized: Invalid refresh token" });
        }

        const newAccessToken = jwt.sign({ id: decoded.id }, config.JWT_KEY, { expiresIn: "15m" });   //for extra safety access and refresh token are created together

        const newRefreshToken = jwt.sign({ id: decoded.id }, config.JWT_KEY, { expiresIn: "7d" });
        const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
        session.refreshTokenHash = newRefreshTokenHash; //update the refresh token hash of the ongoing session
        await session.save();

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
}

async function logout(req, res) {
    try {       //In logout, the goal is to log out only the current device. Because every session has a completely unique refreshTokenHash, we don't actually need the user's ID to find the session
        const currentToken = req.cookies.refreshToken;
        if (!currentToken) {
            return res.status(401).json({ message: "Unauthorized: No refresh token provided" });
        }

        const decoded = jwt.verify(currentToken, config.JWT_KEY); // JUST toValidate the token is authentic/not tampered, but we don't need to extract the id from it to find the session.
        //We hash the refresh token before saving it to the database for the exact same reason we hash user passwords: Security against database breaches.
        //If you saved the raw refresh tokens in plain text, the hacker could copy those tokens, put them in their own browser, and completely hijack the accounts of all your users.
        const refreshTokenHash = crypto.createHash("sha256").update(currentToken).digest("hex");

        const session = await Session.findOne({ refreshTokenHash, revoked: false }); //find the session of the user that is not revoked yet 

        if (!session) {
            return res.status(401).json({ message: "Unauthorized: Invalid refresh token" });
        }
        //ELSE, if found then revoke / logout that  ONE session
        session.revoked = true;
        await session.save();

        res.clearCookie("refreshToken");
        res.status(200).json({ message: "Logout successful" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
}

async function logoutAll(req, res) {

    try {       //"Find every single session that belongs to this specific user." We get that user's ID by decoding the token (decoded.id) 
        const currToken = req.cookies.refreshToken;
        if (!currToken) {
            return res.status(401).json({ message: "Unauthorized: No refresh token provided" });
        }
        const decoded = jwt.verify(currToken, config.JWT_KEY);
        await Session.updateMany({ user: decoded.id, revoked: false }, { revoked: true }); //find all the session of this user and logout all. revoke= false -->true
        res.clearCookie("refreshToken");
        res.status(200).json({ message: "Logout successful from all devices" });


    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
}

export { register, login, getUser, refreshToken, logout, logoutAll };