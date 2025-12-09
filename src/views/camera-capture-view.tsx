import { playerActions } from '@/state/actions/player-actions';
import { cn } from '@/utils/cn';
import { Camera, X } from 'lucide-react';
import * as React from 'react';

interface Props {
	className?: string;
	onComplete: () => void;
}

export const CameraCaptureView: React.FC<Props> = ({
	className,
	onComplete
}) => {
	const videoRef = React.useRef<HTMLVideoElement>(null);
	const canvasRef = React.useRef<HTMLCanvasElement>(null);
	const [stream, setStream] = React.useState<MediaStream | null>(null);
	const [capturedPhoto, setCapturedPhoto] = React.useState<string | null>(null);
	const [isLoading, setIsLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	// Start camera
	React.useEffect(() => {
		const startCamera = async () => {
			try {
				const mediaStream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: 'user', width: 640, height: 480 }
				});
				setStream(mediaStream);
				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream;
				}
			} catch (err) {
				console.error('Camera access error:', err);
				setError('Could not access camera. You can skip this step.');
			}
		};

		startCamera();
	}, []);

	// Cleanup stream when unmounting
	React.useEffect(() => {
		return () => {
			if (stream) {
				stream.getTracks().forEach((track) => track.stop());
			}
		};
	}, [stream]);

	const capturePhoto = () => {
		if (!videoRef.current || !canvasRef.current) return;

		const video = videoRef.current;
		const canvas = canvasRef.current;
		const context = canvas.getContext('2d');

		if (!context) return;

		// Set canvas size to match video
		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		// Draw video frame to canvas
		context.drawImage(video, 0, 0);

		// Get image data
		const photoDataUrl = canvas.toDataURL('image/jpeg', 0.8);
		setCapturedPhoto(photoDataUrl);

		// Stop camera stream
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
		}
	};

	const retakePhoto = () => {
		setCapturedPhoto(null);
		// Restart camera
		navigator.mediaDevices
			.getUserMedia({
				video: { facingMode: 'user', width: 640, height: 480 }
			})
			.then((mediaStream) => {
				setStream(mediaStream);
				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream;
				}
			})
			.catch((err) => {
				console.error('Camera restart error:', err);
				setError('Could not restart camera.');
			});
	};

	const handleConfirm = async () => {
		if (!capturedPhoto) return;

		setIsLoading(true);
		try {
			// Save photo data URL directly to global store
			await playerActions.setPlayerPhoto(capturedPhoto);

			onComplete();
		} catch (err) {
			console.error('Photo save error:', err);
			setError('Failed to save photo. Please try again or skip.');
		} finally {
			setIsLoading(false);
		}
	};

	const handleSkip = () => {
		if (stream) {
			stream.getTracks().forEach((track) => track.stop());
		}
		onComplete();
	};

	return (
		<div
			className={cn(
				'bg-game-surface w-full max-w-lg rounded-lg border border-white/10 shadow-xl',
				className
			)}
		>
			<div className="p-6">
				<h2 className="text-game-text mb-4 text-xl font-bold">
					Take Your Photo
				</h2>

				{error && (
					<div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
						{error}
					</div>
				)}

				<div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-lg bg-black">
					{!capturedPhoto ? (
						<video
							ref={videoRef}
							autoPlay
							playsInline
							muted
							className="h-full w-full object-cover"
						/>
					) : (
						<img
							src={capturedPhoto}
							alt="Captured"
							className="h-full w-full object-cover"
						/>
					)}
				</div>

				<canvas ref={canvasRef} className="hidden" />

				<div className="flex gap-2">
					{!capturedPhoto ? (
						<>
							<button
								type="button"
								onClick={capturePhoto}
								disabled={!stream || !!error}
								className="bg-game-primary flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<Camera size={20} />
								Capture Photo
							</button>
							<button
								type="button"
								onClick={handleSkip}
								className="bg-game-surface flex items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-3 font-medium text-white transition-colors hover:bg-white/5"
							>
								<X size={20} />
								Skip
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={handleConfirm}
								disabled={isLoading}
								className="bg-game-primary flex-1 rounded-lg px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isLoading ? 'Uploading...' : 'Use This Photo'}
							</button>
							<button
								type="button"
								onClick={retakePhoto}
								disabled={isLoading}
								className="bg-game-surface rounded-lg border border-white/20 px-4 py-3 font-medium text-white transition-colors hover:bg-white/5"
							>
								Retake
							</button>
						</>
					)}
				</div>

				{!capturedPhoto && !error && (
					<p className="text-game-text-muted mt-4 text-center text-sm">
						Position your face in the frame and click capture
					</p>
				)}
			</div>
		</div>
	);
};
