import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Mic, MicOff } from 'lucide-react';
import '../styles/callModal.css';

interface CallModalProps {
    visible: boolean;
    callType: 'initiator' | 'receiver'; // người khởi xướng: người gọi, người nhận: người được gọi
    recipientName: string;
    callerName: string;
    callStatus: 'ringing' | 'accepted' | 'ended'; // ringing: đang gọi, accepted: đã chấp nhận, ended: kết thúc
    onAccept?: () => void;
    onReject?: () => void;
    onEnd?: () => void;
    onClose?: () => void;
}

const CallModal: React.FC<CallModalProps> = ({
    visible,
    callType,
    recipientName,
    callerName,
    callStatus,
    onAccept,
    onReject,
    onEnd,
    onClose
}) => {
    const [isMicOn, setIsMicOn] = useState(true);

    if (!visible) return null;

    return (
        <div className="call-modal-overlay">
            <div className="call-modal-container">
                {callType === 'initiator' ? (
                    // === BÊN GỌI ===
                    <div className="call-modal-content">
                        <div className="call-avatar-section">
                            <div className="call-avatar-large">
                                {recipientName.charAt(0).toUpperCase()}
                            </div>
                        </div>

                        <div className="call-info">
                            <h2 className="call-recipient-name">{recipientName}</h2>
                            <p className={`call-status ${callStatus}`}>
                                {callStatus === 'ringing' && '✆ Đang gọi...'}
                                {callStatus === 'accepted' && '✓ Đang nói'}
                                {callStatus === 'ended' && 'Cuộc gọi kết thúc'}
                            </p>
                        </div>

                        <div className="call-duration">
                            {callStatus === 'accepted' && (
                                <div className="duration-timer">
                                    {/*<span>00:00</span>*/}
                                </div>
                            )}
                        </div>

                        <div className="call-actions">
                            {callStatus === 'accepted' && (
                                <button
                                    className="call-btn call-mic-btn"
                                    onClick={() => setIsMicOn(!isMicOn)}
                                    title={isMicOn ? 'Tắt mic' : 'Bật mic'}
                                >
                                    {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                                </button>
                            )}
                            <button
                                className="call-btn call-end-btn"
                                onClick={onEnd}
                                title="Kết thúc cuộc gọi"
                            >
                                <PhoneOff size={24} />
                            </button>
                        </div>
                    </div>
                ) : (
                    // === BÊN ĐƯỢC GỌI ===
                    <div className="call-modal-content">
                        <div className="call-avatar-section">
                            <div className="call-avatar-large receiving">
                                {callerName.charAt(0).toUpperCase()}
                            </div>
                        </div>

                        <div className="call-info">
                            <p className="call-caller-label">Cuộc gọi từ</p>
                            <h2 className="call-caller-name">{callerName}</h2>
                            <p className={`call-status receiving ${callStatus}`}>
                                {callStatus === 'ringing' && '☏ Đang gọi đến...'}
                                {callStatus === 'accepted' && '✓ Đang nói'}
                                {callStatus === 'ended' && 'Cuộc gọi kết thúc'}
                            </p>
                        </div>

                        {callStatus === 'ringing' && (
                            <div className="call-actions receiving">
                                <button
                                    className="call-btn call-accept-btn"
                                    onClick={onAccept}
                                    title="Chấp nhận cuộc gọi"
                                >
                                    <Phone size={24} />
                                </button>
                                <button
                                    className="call-btn call-reject-btn"
                                    onClick={onReject}
                                    title="Từ chối cuộc gọi"
                                >
                                    <PhoneOff size={24} />
                                </button>
                            </div>
                        )}

                        {callStatus === 'accepted' && (
                            <div className="call-actions receiving">
                                <button
                                    className="call-btn call-mic-btn"
                                    onClick={() => setIsMicOn(!isMicOn)}
                                    title={isMicOn ? 'Tắt mic' : 'Bật mic'}
                                >
                                    {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                                </button>
                                <button
                                    className="call-btn call-end-btn"
                                    onClick={onEnd}
                                    title="Kết thúc cuộc gọi"
                                >
                                    <PhoneOff size={24} />
                                </button>
                            </div>
                        )}

                        {callStatus === 'ended' && (
                            <div className="call-actions">
                                <button
                                    className="call-btn call-close-btn"
                                    onClick={onClose}
                                >
                                    Đóng
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CallModal;
