"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/app/components/Toast";

export default function GuestProfileToast({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  const { showToast } = useToast();
  const lastMessage = useRef<string | undefined>(undefined);
  const message = error ?? success;

  useEffect(() => {
    if (!message || lastMessage.current === message) return;
    lastMessage.current = message;
    showToast({
      tone: error ? "error" : "success",
      title: error ? "Guest profile update failed" : "Guest profile updated",
      description: message,
    });
  }, [error, message, showToast]);

  return null;
}
