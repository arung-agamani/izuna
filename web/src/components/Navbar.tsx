import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/uogh.gif";

const Navbar = () => {
    return (
        <nav className="bg-white shadow-lg mb-8 w-screen">
            <div className="max-w-6xl mx-auto px-4">
                <div className="flex justify-between">
                    <div className="flex space-x-7 w-full">
                        <div>
                            <a href="/" className="flex items-center py-4 px-2 no-underline">
                                <img src={logo} alt="Logo" className="h-8 w-8 mr-2" />
                                <span className="font-semibold text-gray-500 text-lg">Cnnuy</span>
                            </a>
                        </div>
                        <div className="hidden md:flex items-center space-x-1 w-full">
                            <Link to="/" className="no-underline">
                                <span className="py-4 px-2 text-green-500 border-b-4 border-green-500 font-semibold">Home</span>
                            </Link>
                            <Link to="/closure" className="no-underline">
                                <span className="py-4 px-2 text-green-500 border-b-4 border-green-500 font-semibold">Bot</span>
                            </Link>
                            <Link to="/test" className="no-underline">
                                <span className="py-4 px-2 text-green-500 border-b-4 border-green-500 font-semibold">Test</span>
                            </Link>
                            <div className="flex-grow" />
                            <Link to="/login" className="no-underline">
                                <span className="py-4 px-2 text-green-500 border-b-4 border-green-500 font-semibold">Login</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
