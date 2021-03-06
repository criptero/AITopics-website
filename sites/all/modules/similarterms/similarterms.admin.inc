<?php

/**
 * @file
 * Settings form.
 */

/**
 * Module settings page.
 */
function similarterms_admin_settings($form, &$form_state) {
  $display_options = array(
    'title_only' => t('Display titles only'),
    'teaser' => t('Display titles and teaser'),
    );
  $form['similarterms_display_options'] = array(
    '#type' => 'radios',
    '#title' => t('Display Options'),
    '#default_value' => variable_get('similarterms_display_options', 'title_only'),
    '#options' => $display_options,
    '#required' => FALSE,
    '#prefix' => '<div>',
    '#suffix' => '</div>',
  );

  $ncount_options = array(
    'default' => t('Default sort order'),
    'unique' => t('Prefer more unique order'),
    );
  $form['similarterms_ncount_options'] = array(
    '#type' => 'radios',
    '#title' => t('Unique Order Options (Recommended you clear cache at the same time.)'),
    '#default_value' => variable_get('similarterms_ncount_options', 'default'),
    '#options' => $ncount_options,
    '#required' => FALSE,
    '#prefix' => '<div>',
    '#suffix' => '</div>',
  );

  $yesno_opts = array(
    1 => t('yes'),
    0 => t('no'),
  );
  $form['similarterms_override_options'] = array(
    '#title' => t('Override Options'),
    '#description' => t('Allow override of similarterms choices.'),
    '#default_value' => variable_get('similarterms_override_options', 0),
    '#options' => $yesno_opts,
    '#required' => FALSE,
    '#prefix' => '<div>',
    '#suffix' => '</div>',
  );

  $cache_options = drupal_map_assoc(array(0, 300, 600, 900, 1800, 3600, 7200, 21600, 43200, 86400, 604800, 1209600, 2419200, 4838400, 9676800, 31536000),  'format_interval');
  $cache_options[0] = t('Never');

  $form['similarterms_cache_options'] = array(
    '#type' => 'select',
    '#title' => t('Cache Options'),
    '#default_value' => variable_get('similarterms_cache_options', 3600),
    '#options' => $cache_options,
    '#required' => FALSE,
//      '#prefix' => '<div>',
//      '#suffix' => '</div>',
  );

  $form['similarterms_clear_cache'] = array(
    '#type' => 'checkbox',
    '#title' => t('Clear Cache'),
    '#description' => t('Clear Similarterms Block Cache'),
//      '#prefix' => '<div>',
//      '#suffix' => '</div>',
  );
  // Get the weblinks categories to add to the blogroll
//  $result = db_query('SELECT tid, name FROM {term_data} WHERE vid = %d ORDER BY weight, name', _weblinks_get_vocid());

//  while ($row = db_fetch_object($result)) {
    // Set which link categories get displayed on the links page

//    $form[$row->tid]['weblinks_page_'. $row->tid] = array(
//      '#type' => 'checkbox',
//      '#title' => t($row->name),
//      '#default_value' => variable_get('weblinks_page_'. $row->tid, 1),
//      '#required' => FALSE,
//      '#description' => t('Check to enable this category'),
//    );
//  }
  $form['#submit'][] = 'similarterms_admin_settings_submit';
  return system_settings_form($form);
}

function similarterms_admin_settings_submit($form, &$form_state) {
  if ($form_state['values']['similarterms_clear_cache']) {
    cache_clear_all('*', 'cache_similarterms', TRUE);
    drupal_set_message(t('Similarterms Block Cache is now cleared'));
  }
}
