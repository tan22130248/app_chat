import React, {useEffect, useRef} from "react";
import {ZegoUIKitPrebuilt} from "@zegocloud/zego-uikit-prebuilt";
import {ZEGO_APP_ID, ZEGO_SERVER_SECRET} from "../config/zego";
import "../styles/videoCallScreen.css";

interface VideoCallScreenProps {
    roomId: string;
    username: string;
    peerName: string;
    onEndCall: () => void;
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
                                                             roomId,
                                                             username,
                                                             peerName,
                                                             onEndCall,
                                                         }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const zpRef = useRef<any>(null);
    const destroyedRef = useRef(false);


    const [leftRoom, setLeftRoom] = React.useState(false);
    const destroyZego = () => {
        if (destroyedRef.current) return;
        destroyedRef.current = true;

        try {
            zpRef.current?.destroy();
        } catch (e) {
            console.warn("[Zego] destroy error ignored", e);
        }

        zpRef.current = null;
    };

    useEffect(() => {
        if (!containerRef.current) return;

        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
            ZEGO_APP_ID,
            ZEGO_SERVER_SECRET,
            roomId,
            username,
            username
        );

        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zpRef.current = zp;

        zp.joinRoom({
            container: containerRef.current,
            scenario: {mode: ZegoUIKitPrebuilt.OneONoneCall},

            showPreJoinView: false,
            onJoinRoom: () => {
                console.log("[Zego] Joined room again");
                setLeftRoom(false);
            },
            onLeaveRoom: () => {
                console.log("[Zego] Left room (local)");
                setLeftRoom(true);
            },
        });

        return () => {
            zpRef.current = null;
        };
    }, []);

    return (
        <div className="zego-video-wrapper">
            <div ref={containerRef} className="zego-container"/>

            {leftRoom && (
                <button
                    className="zego-exit-chat-btn"
                    onClick={() => {
                        console.log("[APP] Exit to chat");
                        destroyZego();
                        onEndCall();
                    }}
                >
                    Thoát về chat
                </button>
            )}
        </div>
    );
};

export default VideoCallScreen;