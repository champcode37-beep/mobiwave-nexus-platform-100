#!/usr/bin/env node

/**
 * Test script to verify Mspace API edge function CORS configuration
 * Run with: node scripts/test-mspace-cors.js
 */

const SUPABASE_URL = 'https://bhnjecmsalnqxgociwuk.supabase.co';
const FUNCTION_NAME = 'mspace-api';

async function testCorsPreflightRequest() {
  console.log('🔍 Testing CORS preflight request...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://af5300f749d04c7e8030b9b20639e487-c339149eaa1844158b2cc3952.fly.dev',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
    
    console.log(`📊 Preflight Response Status: ${response.status}`);
    console.log('📋 Response Headers:');
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase().includes('access-control')) {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    if (response.status === 200) {
      console.log('✅ CORS preflight request successful');
      return true;
    } else {
      console.log('❌ CORS preflight request failed');
      return false;
    }
  } catch (error) {
    console.error('❌ CORS preflight test failed:', error.message);
    return false;
  }
}

async function testHealthCheck() {
  console.log('\n🔍 Testing health-check function...');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/health-check`, {
      method: 'GET'
    });
    
    console.log(`📊 Health Check Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Health check successful');
      console.log('📋 Environment check:', {
        supabase_url: data.environment?.supabase_url,
        service_role_key: data.environment?.service_role_key,
        encryption_key: data.environment?.encryption_key
      });
      return true;
    } else {
      console.log('❌ Health check failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Health check test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Mspace API CORS Test\n');
  
  const corsResult = await testCorsPreflightRequest();
  const healthResult = await testHealthCheck();
  
  console.log('\n📊 Test Summary:');
  console.log(`  CORS Preflight: ${corsResult ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Health Check: ${healthResult ? '✅ PASS' : '❌ FAIL'}`);
  
  if (corsResult && healthResult) {
    console.log('\n🎉 All tests passed! The Mspace API should be working now.');
  } else {
    console.log('\n⚠️  Some tests failed. The edge function may need redeployment.');
    console.log('\n💡 To fix the issue:');
    console.log('1. Redeploy the mspace-api edge function');
    console.log('2. Ensure environment variables are set correctly');
    console.log('3. Check that CORS headers are properly configured');
  }
}

main().catch(console.error);
