package com.example.xpandbackend.exception;
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) { super(message); }
}
