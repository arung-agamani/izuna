import React from "react";
import Button from "../components/Button";
import axios from "axios";

const Login = () => {
    const onLogin = (loginUrl: string) => {
        const params = new URL(window.location.href).searchParams;
        // axios.get(loginUrl, {
        //     params: {
        //         state: params.get("redirect"),
        //     },
        // });
        window.location.href = `${loginUrl}?redirect=${params.get("redirect")}`;
    };
    return (
        <div>
            <h2 className="text-2xl">You are not logged in. Please login through the following methods.</h2>
            <p className="text-xl">
                Discord Login <br />
                <span className="text-lg">
                    Use this login method if you want to access any functions related to the bot (as seen on the navigation bar upside)
                </span>
            </p>

            {/* <a href="/api/auth/discord" className=" no-underline"> */}
            <Button onClick={() => onLogin("/api/auth/discord")}>Discord Login</Button>
            {/* </a> */}
            <p className="text-xl">
                Google Login <br />
                <span className="text-lg">
                    Use this login method if you want to access any functions related to the Google. <br />
                    Currently not functional
                </span>
            </p>
            <a /* href="/api/auth/google" */ href="#" className=" no-underline">
                <Button disabled>Google Login</Button>
            </a>
        </div>
    );
};

export default Login;
