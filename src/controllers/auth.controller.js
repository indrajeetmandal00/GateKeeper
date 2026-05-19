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


        const accessToken = jwt.sign({ id: user._id,
                                       sessionId: session._id,
                                       

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

        const newAccessToken = jwt.sign({ id: decoded.id }, config.JWT_KEY, { expiresIn: "15m" });   //for extra safety access and refresh token are created together
        const newRefreshToken = jwt.sign({ id: decoded.id }, config.JWT_KEY, { expiresIn: "7d" });

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json({ accessToken });
        res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
}

export { register, getUser, refreshToken };