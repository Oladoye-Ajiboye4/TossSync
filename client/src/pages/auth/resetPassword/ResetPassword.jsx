import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { ToastContainer, toast, Bounce } from 'react-toastify';
import InputField from '../../../components/InputField';
import { Icon } from '@iconify/react';
import api from '../../../api/axios';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [tokenValid, setTokenValid] = useState(true);
    const navigate = useNavigate();
    const token = searchParams.get('token');

    useEffect(() => {
        // Check if token exists in URL
        if (!token) {
            setTokenValid(false);
            errorNotify('Invalid or missing reset token');
        }
    }, [token]);

    // Toastify notification for success
    const notify = (message) => {
        toast.success(message, {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
        });
    };

    // Toastify notification for error 
    const errorNotify = (errorMessage) => {
        toast.error(`${errorMessage}`, {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: false,
            pauseOnHover: true,
            draggable: true,
            theme: "light",
            transition: Bounce,
        });
    };

    // Formik handles all form validations and state management
    const formik = useFormik({
        initialValues: {
            password: '',
            confirmPassword: '',
        },
        validateOnMount: true,
        validationSchema: Yup.object({
            password: Yup.string()
                .min(8, 'Password must be at least 8 characters')
                .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, 'At least 8 chars (uppercase, lowercase, number, special char)')
                .required('Required'),
            confirmPassword: Yup.string()
                .oneOf([Yup.ref('password'), null], 'Passwords must match')
                .required('Required'),
        }),
        onSubmit: async (values, { setSubmitting }) => {
            try {
                await api.post('/auth/reset-password', { token, password: values.password });
                notify('Password reset successful!');
                setIsSubmitted(true);
                setTimeout(() => {
                    navigate('/signin');
                }, 3000);
            } catch (error) {
                if (error.response && error.response.status === 400) {
                    errorNotify('Invalid or expired token. Request a new reset link');
                    setTokenValid(false);
                } else if (error.response && error.response.data && error.response.data.message) {
                    errorNotify(error.response.data.message);
                } else {
                    errorNotify('Unable to reset password. Try again later');
                }
            } finally {
                setSubmitting(false);
            }
        },
    });

    return (
        <main className='min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-8'>
            <div className='w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center'>
                <section className='hidden md:flex flex-col gap-5 p-8 rounded-3xl bg-white/70 backdrop-blur border border-tertiary/40 shadow-[0_20px_60px_-25px_rgba(120,53,15,0.45)]'>
                    <span className='text-sm font-semibold tracking-widest text-secondary uppercase'>Create New Password</span>
                    <h1 className='text-4xl font-extrabold text-secondary leading-tight'>Set a strong, secure password.</h1>
                    <p className='text-[#5b4a3a]/80 text-base leading-relaxed'>Choose a password that's unique and hasn't been used before. Make it strong to keep your account safe.</p>
                    <div className='flex items-center gap-3 text-[#5b4a3a]'>
                        <Icon icon="mdi:shield-lock" width="24" height="24" className='text-secondary' />
                        <span className='text-sm font-medium'>At least 8 characters</span>
                    </div>
                    <div className='flex items-center gap-3 text-[#5b4a3a]'>
                        <Icon icon="mdi:format-letter-case" width="24" height="24" className='text-secondary' />
                        <span className='text-sm font-medium'>Uppercase and lowercase letters</span>
                    </div>
                    <div className='flex items-center gap-3 text-[#5b4a3a]'>
                        <Icon icon="mdi:numeric" width="24" height="24" className='text-secondary' />
                        <span className='text-sm font-medium'>Numbers and special characters</span>
                    </div>
                </section>

                <div className='w-full rounded-3xl bg-white/90 backdrop-blur border border-tertiary/40 shadow-[0_24px_70px_-35px_rgba(120,53,15,0.6)] p-6 sm:p-8'>
                    {!isSubmitted && tokenValid ? (
                        <>
                            <form className='flex flex-col gap-4' onSubmit={formik.handleSubmit}>
                                <div className='text-center space-y-2'>
                                    <div className='flex justify-center mb-4'>
                                        <div className='bg-primary/30 p-4 rounded-full'>
                                            <Icon icon="mdi:lock-reset" width="40" height="40" className='text-secondary' />
                                        </div>
                                    </div>
                                    <h1 className='text-3xl sm:text-4xl font-extrabold text-secondary'>Reset Password</h1>
                                    <p className='text-sm sm:text-base text-[#5b4a3a]/70'>Enter your new password below.</p>
                                </div>

                                <InputField type="password" name="password" placeholder="New Password" formik={formik} />
                                <InputField type="password" name="confirmPassword" placeholder="Confirm New Password" formik={formik} />

                                <button
                                    type='submit'
                                    className='bg-secondary text-white py-3 rounded-xl font-bold shadow-lg hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed'
                                    disabled={!formik.isValid || formik.isSubmitting}
                                >
                                    {formik.isSubmitting ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </form>

                            <div className='mt-6 flex flex-col sm:flex-row gap-3 font-semibold text-base text-secondary'>
                                <Link className='flex-1 text-center bg-tertiary/30 text-secondary py-3 rounded-xl hover:bg-tertiary/40 transition' to='/signin'>
                                    Back to Sign In
                                </Link>
                                <Link className='flex-1 text-center bg-tertiary/30 text-secondary py-3 rounded-xl hover:bg-tertiary/40 transition' to='/'>
                                    Go Home
                                </Link>
                            </div>
                        </>
                    ) : isSubmitted ? (
                        <div className='flex flex-col gap-4 items-center text-center'>
                            <div className='bg-green-100 p-4 rounded-full'>
                                <Icon icon="mdi:check-circle" width="40" height="40" className='text-green-700' />
                            </div>
                            <h2 className='text-2xl font-extrabold text-secondary'>Password Reset Successful!</h2>
                            <p className='text-[#5b4a3a]/70'>
                                Your password has been changed successfully. You can now sign in with your new password.
                            </p>
                            <Link
                                to='/signin'
                                className='mt-4 w-full bg-secondary text-white py-3 rounded-xl hover:brightness-95 transition font-semibold'
                            >
                                Sign In Now
                            </Link>
                        </div>
                    ) : (
                        <div className='flex flex-col gap-4 items-center text-center'>
                            <div className='bg-red-100 p-4 rounded-full'>
                                <Icon icon="mdi:alert-circle" width="40" height="40" className='text-red-700' />
                            </div>
                            <h2 className='text-2xl font-extrabold text-secondary'>Invalid or Expired Link</h2>
                            <p className='text-[#5b4a3a]/70'>
                                This password reset link is invalid or has expired. Please request a new one.
                            </p>
                            <Link
                                to='/forgot-password'
                                className='mt-4 w-full bg-secondary text-white py-3 rounded-xl hover:brightness-95 transition font-semibold'
                            >
                                Request New Link
                            </Link>
                        </div>
                    )}
                </div>
            </div>
            <ToastContainer position="top-center" theme="light" transition={Bounce} />
        </main>
    );
};

export default ResetPassword;
