import React from "react";
import Button from "../components/Button";

const Login = () => {
    return (
        <div>
            <a href="/api/auth/discord" className=" no-underline">
                <Button>Discord Login</Button>
            </a>
            <a href="/api/auth/google" className=" no-underline">
                <Button>Google Login</Button>
            </a>
        </div>
    );
};

export default Login;
